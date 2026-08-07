import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'
import { defaultModel, type AiProvider } from '@/lib/ai/providers'
import { DEFAULT_AI_SYSTEM_PROMPT } from '@/lib/ai/reply-style'

const DEFAULT_PROMPT = DEFAULT_AI_SYSTEM_PROMPT

/**
 * GET /api/ai/config — load AI settings (never returns raw API key).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('ai_config')
    .select(
      'provider, model, system_prompt, auto_reply_enabled, skip_if_assigned, max_history_messages, lead_sync_enabled, lead_pipeline_id, lead_stage_id, lead_qualify_enabled, lead_hot_budget_inr, lead_timeline_max_days, lead_qualify_min_messages, lead_qualify_cooldown_minutes, lead_auto_tag, lead_hot_stage_id, lead_warm_stage_id, lead_cold_stage_id, lead_hot_auto_assign, lead_hot_assign_agent_id, lead_alert_enabled, lead_alert_phone, call_phone, call_phone_in_replies, api_key_encrypted, updated_at',
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    configured: !!data?.api_key_encrypted,
    provider: (data?.provider as AiProvider) ?? 'openai',
    model: data?.model ?? defaultModel('openai'),
    system_prompt: data?.system_prompt ?? DEFAULT_PROMPT,
    auto_reply_enabled: data?.auto_reply_enabled ?? false,
    skip_if_assigned: data?.skip_if_assigned ?? true,
    max_history_messages: data?.max_history_messages ?? 20,
    lead_sync_enabled: data?.lead_sync_enabled ?? false,
    lead_pipeline_id: data?.lead_pipeline_id ?? null,
    lead_stage_id: data?.lead_stage_id ?? null,
    lead_qualify_enabled: data?.lead_qualify_enabled !== false,
    lead_hot_budget_inr: data?.lead_hot_budget_inr ?? 30000,
    lead_timeline_max_days: data?.lead_timeline_max_days ?? 60,
    lead_qualify_min_messages: data?.lead_qualify_min_messages ?? 1,
    lead_qualify_cooldown_minutes: data?.lead_qualify_cooldown_minutes ?? 5,
    lead_auto_tag: data?.lead_auto_tag !== false,
    lead_hot_stage_id: data?.lead_hot_stage_id ?? null,
    lead_warm_stage_id: data?.lead_warm_stage_id ?? null,
    lead_cold_stage_id: data?.lead_cold_stage_id ?? null,
    lead_hot_auto_assign: data?.lead_hot_auto_assign !== false,
    lead_hot_assign_agent_id: data?.lead_hot_assign_agent_id ?? null,
    lead_alert_enabled: data?.lead_alert_enabled !== false,
    lead_alert_phone: data?.lead_alert_phone ?? null,
    call_phone: data?.call_phone ?? null,
    call_phone_in_replies: data?.call_phone_in_replies !== false,
    updated_at: data?.updated_at ?? null,
  })
}

/**
 * POST /api/ai/config — save AI settings (encrypts API key server-side).
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const provider = (body.provider === 'gemini' ? 'gemini' : 'openai') as AiProvider
  const model =
    typeof body.model === 'string' && body.model.trim()
      ? body.model.trim()
      : defaultModel(provider)
  const system_prompt =
    typeof body.system_prompt === 'string' && body.system_prompt.trim()
      ? body.system_prompt.trim()
      : DEFAULT_PROMPT
  const auto_reply_enabled = !!body.auto_reply_enabled
  const skip_if_assigned = body.skip_if_assigned !== false
  const max_history_messages = Math.min(
    50,
    Math.max(1, Number(body.max_history_messages) || 20),
  )
  const lead_sync_enabled = !!body.lead_sync_enabled
  const lead_pipeline_id =
    typeof body.lead_pipeline_id === 'string' && body.lead_pipeline_id.trim()
      ? body.lead_pipeline_id.trim()
      : null
  const lead_stage_id =
    typeof body.lead_stage_id === 'string' && body.lead_stage_id.trim()
      ? body.lead_stage_id.trim()
      : null
  const lead_qualify_enabled = body.lead_qualify_enabled !== false
  const lead_hot_budget_inr = Math.max(
    0,
    Number(body.lead_hot_budget_inr) || 30000,
  )
  const lead_timeline_max_days = Math.min(
    365,
    Math.max(1, Number(body.lead_timeline_max_days) || 60),
  )
  const lead_qualify_min_messages = Math.min(
    10,
    Math.max(1, Number(body.lead_qualify_min_messages) || 1),
  )
  const lead_qualify_cooldown_minutes = Math.min(
    120,
    Math.max(0, Number(body.lead_qualify_cooldown_minutes) ?? 5),
  )
  const lead_auto_tag = body.lead_auto_tag !== false
  const lead_hot_stage_id =
    typeof body.lead_hot_stage_id === 'string' && body.lead_hot_stage_id.trim()
      ? body.lead_hot_stage_id.trim()
      : null
  const lead_warm_stage_id =
    typeof body.lead_warm_stage_id === 'string' && body.lead_warm_stage_id.trim()
      ? body.lead_warm_stage_id.trim()
      : null
  const lead_cold_stage_id =
    typeof body.lead_cold_stage_id === 'string' && body.lead_cold_stage_id.trim()
      ? body.lead_cold_stage_id.trim()
      : null
  const lead_hot_auto_assign = body.lead_hot_auto_assign !== false
  const lead_hot_assign_agent_id =
    typeof body.lead_hot_assign_agent_id === 'string' && body.lead_hot_assign_agent_id.trim()
      ? body.lead_hot_assign_agent_id.trim()
      : null
  const lead_alert_enabled = body.lead_alert_enabled !== false
  const lead_alert_phone =
    typeof body.lead_alert_phone === 'string' && body.lead_alert_phone.trim()
      ? body.lead_alert_phone.trim()
      : null
  const call_phone =
    typeof body.call_phone === 'string' && body.call_phone.trim()
      ? body.call_phone.trim()
      : null
  const call_phone_in_replies = body.call_phone_in_replies !== false

  const { data: existing } = await supabase
    .from('ai_config')
    .select('id, api_key_encrypted')
    .eq('user_id', user.id)
    .maybeSingle()

  let encryptedKey: string | null = existing?.api_key_encrypted ?? null
  const incomingKey = typeof body.api_key === 'string' ? body.api_key.trim() : ''

  if (incomingKey && incomingKey !== '••••••••••••••••') {
    try {
      encryptedKey = encrypt(incomingKey)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Encryption failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  if (!encryptedKey) {
    return NextResponse.json(
      { error: 'API key is required for initial setup' },
      { status: 400 },
    )
  }

  const row = {
    user_id: user.id,
    provider,
    api_key_encrypted: encryptedKey,
    model,
    system_prompt,
    auto_reply_enabled,
    skip_if_assigned,
    max_history_messages,
    lead_sync_enabled,
    lead_pipeline_id,
    lead_stage_id,
    lead_qualify_enabled,
    lead_hot_budget_inr,
    lead_timeline_max_days,
    lead_qualify_min_messages,
    lead_qualify_cooldown_minutes,
    lead_auto_tag,
    lead_hot_stage_id,
    lead_warm_stage_id,
    lead_cold_stage_id,
    lead_hot_auto_assign,
    lead_hot_assign_agent_id,
    lead_alert_enabled,
    lead_alert_phone,
    call_phone,
    call_phone_in_replies,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('ai_config')
      .update(row)
      .eq('user_id', user.id)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  } else {
    const { error: insertError } = await supabase.from('ai_config').insert(row)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  // Quick sanity check — decrypt + noop (don't call LLM on save).
  try {
    decrypt(encryptedKey)
  } catch {
    return NextResponse.json(
      { error: 'Saved key failed decryption — check ENCRYPTION_KEY' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, configured: true })
}
