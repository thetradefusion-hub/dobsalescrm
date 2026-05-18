import { decrypt } from '@/lib/whatsapp/encryption'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { generateChatCompletion } from '@/lib/ai/providers'
import { fetchConversationChatMessages } from '@/lib/ai/conversation-history'
import { loadAiConfig, type AiConfigRow } from '@/lib/ai/run-reply'
import { DEFAULT_DEAL_CURRENCY } from '@/lib/currency'
import {
  QUALIFICATION_EXTRACT_PROMPT,
  parseQualificationJson,
  TEMPERATURE_TAG_NAMES,
  type LeadQualificationExtract,
  type LeadTemperature,
  DEFAULT_HOT_BUDGET_INR,
  DEFAULT_TIMELINE_MAX_DAYS,
} from '@/lib/ai/lead-qualification'
import { handleHotLeadActions } from '@/lib/ai/hot-lead-actions'

export interface SyncLeadOptions {
  /** Ignore re-qualify cooldown (backfill). */
  force?: boolean
  /** Skip assign + WhatsApp alert (backfill default). */
  skipHotActions?: boolean
}

export const AI_LEAD_NOTE_PREFIX = '[AI Lead Summary]'

const TEMPERATURE_RANK: Record<LeadTemperature, number> = {
  cold: 0,
  warm: 1,
  hot: 2,
}

/**
 * After an AI WhatsApp reply, create/update pipeline deal, qualify hot/warm/cold,
 * move stage, tag contact, and refresh AI summary note.
 */
export async function syncLeadFromAiConversation(
  input: {
    userId: string
    contactId: string
    conversationId: string
  },
  options?: SyncLeadOptions,
): Promise<boolean> {
  try {
    const config = await loadAiConfig(input.userId)
    if (!config?.lead_sync_enabled || !config.api_key_encrypted) return false

    const db = supabaseAdmin()

    const { data: contact } = await db
      .from('contacts')
      .select('id, name, phone')
      .eq('id', input.contactId)
      .eq('user_id', input.userId)
      .maybeSingle()

    if (!contact) return false

    const history = await fetchConversationChatMessages(
      input.conversationId,
      config.max_history_messages ?? 20,
    )

    const minMessages = config.lead_qualify_min_messages ?? 1
    const customerTurns = history.filter((m) => m.role === 'user').length
    if (customerTurns < minMessages) return false

    let apiKey: string
    try {
      apiKey = decrypt(config.api_key_encrypted)
    } catch {
      console.error('[ai-lead] API key decrypt failed')
      return false
    }

    const thresholds = {
      hotBudgetInr: config.lead_hot_budget_inr ?? DEFAULT_HOT_BUDGET_INR,
      timelineMaxDays: config.lead_timeline_max_days ?? DEFAULT_TIMELINE_MAX_DAYS,
    }

    const qualified = await extractLeadQualification(
      config,
      apiKey,
      history,
      contact.name,
      thresholds,
    )
    if (!qualified) return false

    const pipelineTarget = await resolvePipelineTarget(input.userId, config)
    if (!pipelineTarget) {
      console.warn('[ai-lead] no pipeline/stage configured')
      return false
    }

    const { data: openDeal } = await db
      .from('deals')
      .select('id, title, lead_temperature, qualified_at, stage_id')
      .eq('user_id', input.userId)
      .eq('contact_id', input.contactId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (
      !options?.force &&
      openDeal &&
      config.lead_qualify_enabled !== false &&
      shouldSkipRequalify(openDeal.qualified_at, openDeal.lead_temperature, qualified, config)
    ) {
      await db
        .from('deals')
        .update({
          notes: formatDealNotes(qualified),
          conversation_id: input.conversationId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', openDeal.id)
      await upsertAiLeadNote(input.userId, input.contactId, qualified)
      return true
    }

    const stageId = await resolveStageForTemperature(
      input.userId,
      pipelineTarget.pipeline_id,
      qualified.temperature,
      config,
      openDeal?.stage_id ?? pipelineTarget.stage_id,
    )

    const now = new Date().toISOString()
    const dealPayload = buildDealPayload(qualified, input.conversationId, stageId, config)

    let dealId = openDeal?.id

    if (openDeal) {
      await db.from('deals').update(dealPayload).eq('id', openDeal.id)
    } else {
      const { data: created } = await db
        .from('deals')
        .insert({
          user_id: input.userId,
          pipeline_id: pipelineTarget.pipeline_id,
          contact_id: input.contactId,
          currency: DEFAULT_DEAL_CURRENCY,
          status: 'open',
          ...dealPayload,
        })
        .select('id')
        .single()
      dealId = created?.id
    }

    if (config.lead_auto_tag !== false) {
      await syncTemperatureTags(input.userId, input.contactId, qualified.temperature)
    }

    await upsertAiLeadNote(input.userId, input.contactId, qualified)

    const previousTemp = openDeal?.lead_temperature as LeadTemperature | null | undefined
    const isNewlyHot = qualified.temperature === 'hot' && previousTemp !== 'hot'

    if (isNewlyHot && !options?.skipHotActions) {
      await handleHotLeadActions({
        userId: input.userId,
        contactId: input.contactId,
        conversationId: input.conversationId,
        dealId,
        contactName: contact.name,
        contactPhone: contact.phone,
        qualified,
        config,
      })
    }

    return true
  } catch (err) {
    console.error('[ai-lead] sync failed:', err)
    return false
  }
}

function buildDealPayload(
  q: LeadQualificationExtract,
  conversationId: string,
  stageId: string,
  config: AiConfigRow,
) {
  const now = new Date().toISOString()
  const base = {
    title: q.title,
    notes: formatDealNotes(q),
    conversation_id: conversationId,
    updated_at: now,
    value: q.budget_inr ?? 0,
  }
  if (config.lead_qualify_enabled === false) {
    return base
  }
  return {
    ...base,
    stage_id: stageId,
    lead_temperature: q.temperature,
    lead_score: q.score,
    lead_budget_inr: q.budget_inr,
    qualified_at: now,
  }
}

function formatDealNotes(q: LeadQualificationExtract): string {
  const stamp = new Date().toLocaleString('en-IN')
  const temp = q.temperature.toUpperCase()
  const lines = [
    `AI summary (${stamp}) · ${temp} (${q.score})`,
    q.summary,
    '',
    `Service: ${q.service ?? '—'}`,
    `Budget (INR): ${q.budget_inr != null ? `₹${q.budget_inr.toLocaleString('en-IN')}` : '—'}`,
    `Timeline: ${q.timeline_days != null ? `${q.timeline_days} days` : '—'}`,
    `Next: ${q.recommended_next_step}`,
    `Reason: ${q.reasoning}`,
  ]
  return lines.join('\n')
}

function shouldSkipRequalify(
  qualifiedAt: string | null,
  prevTemp: string | null,
  next: LeadQualificationExtract,
  config: AiConfigRow,
): boolean {
  const cooldownMin = config.lead_qualify_cooldown_minutes ?? 5
  if (!qualifiedAt || cooldownMin <= 0) return false

  const elapsed = Date.now() - new Date(qualifiedAt).getTime()
  if (elapsed >= cooldownMin * 60_000) return false

  const prev = prevTemp as LeadTemperature | null
  if (!prev || !(prev in TEMPERATURE_RANK)) return false

  return TEMPERATURE_RANK[next.temperature] <= TEMPERATURE_RANK[prev]
}

async function extractLeadQualification(
  config: AiConfigRow,
  apiKey: string,
  history: { role: string; content: string }[],
  contactName: string | null,
  thresholds: { hotBudgetInr: number; timelineMaxDays: number },
): Promise<LeadQualificationExtract | null> {
  const transcript = history
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Business'}: ${m.content}`)
    .join('\n')

  const raw = await generateChatCompletion({
    provider: config.provider,
    apiKey,
    model: config.model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: QUALIFICATION_EXTRACT_PROMPT },
      {
        role: 'user',
        content: `Hot lead rules: budget ≥ ₹${thresholds.hotBudgetInr}, timeline ≤ ${thresholds.timelineMaxDays} days, serious buyer, clear requirements.\nContact: ${contactName ?? 'Unknown'}\n\nConversation:\n${transcript}`,
      },
    ],
  })

  return parseQualificationJson(raw, contactName, thresholds)
}

async function resolveStageForTemperature(
  userId: string,
  pipelineId: string,
  temperature: LeadTemperature,
  config: AiConfigRow,
  fallbackStageId: string,
): Promise<string> {
  const configured =
    temperature === 'hot'
      ? config.lead_hot_stage_id
      : temperature === 'warm'
        ? config.lead_warm_stage_id
        : config.lead_cold_stage_id

  if (configured) {
    const db = supabaseAdmin()
    const { data: stage } = await db
      .from('pipeline_stages')
      .select('id')
      .eq('id', configured)
      .eq('pipeline_id', pipelineId)
      .maybeSingle()
    if (stage) return stage.id
  }

  const db = supabaseAdmin()
  const { data: stages } = await db
    .from('pipeline_stages')
    .select('id, name, position')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })

  if (!stages?.length) return fallbackStageId

  const names = stages.map((s) => ({ id: s.id, n: s.name.toLowerCase() }))

  const findBy = (...needles: string[]) => {
    const hit = names.find((s) => needles.some((k) => s.n.includes(k)))
    return hit?.id
  }

  if (temperature === 'hot') {
    return (
      findBy('hot', 'qualified', 'proposal', 'negotiation') ??
      stages[Math.min(1, stages.length - 1)]?.id ??
      fallbackStageId
    )
  }
  if (temperature === 'warm') {
    return (
      findBy('qualified', 'new lead', 'contacted') ??
      stages[0]?.id ??
      fallbackStageId
    )
  }
  return findBy('cold', 'nurture', 'new lead') ?? stages[0]?.id ?? fallbackStageId
}

async function syncTemperatureTags(
  userId: string,
  contactId: string,
  temperature: LeadTemperature,
): Promise<void> {
  const db = supabaseAdmin()
  const activeTag = TEMPERATURE_TAG_NAMES[temperature]
  const allTags = Object.values(TEMPERATURE_TAG_NAMES)

  for (const name of allTags) {
    let tagId = await findOrCreateTag(userId, name)
    if (!tagId) continue

    if (name === activeTag) {
      const { data: existing } = await db
        .from('contact_tags')
        .select('contact_id')
        .eq('contact_id', contactId)
        .eq('tag_id', tagId)
        .maybeSingle()
      if (!existing) {
        await db.from('contact_tags').insert({ contact_id: contactId, tag_id: tagId })
      }
    } else {
      await db.from('contact_tags').delete().eq('contact_id', contactId).eq('tag_id', tagId)
    }
  }
}

async function findOrCreateTag(userId: string, name: string): Promise<string | null> {
  const db = supabaseAdmin()
  const { data: existing } = await db
    .from('tags')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', name)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await db
    .from('tags')
    .insert({ user_id: userId, name, color: tagColorForName(name) })
    .select('id')
    .single()

  if (error) {
    console.warn('[ai-lead] tag create failed:', name, error.message)
    return null
  }
  return created.id
}

function tagColorForName(name: string): string {
  if (name.includes('Hot')) return '#f97316'
  if (name.includes('Warm')) return '#eab308'
  return '#64748b'
}

async function resolvePipelineTarget(
  userId: string,
  config: AiConfigRow,
): Promise<{ pipeline_id: string; stage_id: string } | null> {
  const db = supabaseAdmin()

  if (config.lead_pipeline_id) {
    let stageId = config.lead_stage_id
    if (!stageId) {
      const { data: stage } = await db
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', config.lead_pipeline_id)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()
      stageId = stage?.id ?? null
    } else {
      const { data: stage } = await db
        .from('pipeline_stages')
        .select('id')
        .eq('id', stageId)
        .eq('pipeline_id', config.lead_pipeline_id)
        .maybeSingle()
      if (!stage) stageId = null
    }
    if (stageId) {
      return { pipeline_id: config.lead_pipeline_id, stage_id: stageId }
    }
  }

  const { data: pipeline } = await db
    .from('pipelines')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!pipeline) return null

  const { data: stage } = await db
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipeline.id)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!stage) return null
  return { pipeline_id: pipeline.id, stage_id: stage.id }
}

async function upsertAiLeadNote(
  userId: string,
  contactId: string,
  q: LeadQualificationExtract,
): Promise<void> {
  const db = supabaseAdmin()
  const tempLabel = q.temperature.toUpperCase()
  const noteBody = `${AI_LEAD_NOTE_PREFIX} · ${tempLabel} (${q.score})
${q.summary}

Service: ${q.service ?? '—'} | Budget: ${q.budget_inr != null ? `₹${q.budget_inr.toLocaleString('en-IN')}` : '—'}
Next: ${q.recommended_next_step}

— Updated ${new Date().toLocaleString('en-IN')}`

  const { data: existing } = await db
    .from('contact_notes')
    .select('id')
    .eq('contact_id', contactId)
    .eq('user_id', userId)
    .like('note_text', `${AI_LEAD_NOTE_PREFIX}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    await db.from('contact_notes').update({ note_text: noteBody }).eq('id', existing.id)
  } else {
    await db.from('contact_notes').insert({
      contact_id: contactId,
      user_id: userId,
      note_text: noteBody,
    })
  }
}
