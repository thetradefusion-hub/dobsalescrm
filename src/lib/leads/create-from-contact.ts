import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeadTemperature } from '@/lib/ai/lead-qualification'
import { DEFAULT_DEAL_CURRENCY } from '@/lib/currency'

export interface CreateLeadInput {
  contactId: string
  title?: string
  pipelineId?: string
  stageId?: string
  leadTemperature?: LeadTemperature | null
  leadScore?: number | null
  leadBudgetInr?: number | null
  value?: number
  notes?: string
}

export interface CreateLeadResult {
  dealId: string
  created: boolean
}

async function resolveDefaultPipeline(
  supabase: SupabaseClient,
  userId: string,
  pipelineId?: string,
) {
  if (pipelineId) {
    const { data } = await supabase
      .from('pipelines')
      .select('id')
      .eq('id', pipelineId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data) return data.id
  }

  const { data: pipelines } = await supabase
    .from('pipelines')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)

  return pipelines?.[0]?.id ?? null
}

async function resolveDefaultStage(
  supabase: SupabaseClient,
  pipelineId: string,
  stageId?: string,
) {
  if (stageId) {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('id', stageId)
      .eq('pipeline_id', pipelineId)
      .maybeSingle()
    if (data) return data.id
  }

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, position')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })

  if (!stages?.length) return null

  const newLead = stages.find((s) =>
    s.name.toLowerCase().includes('new lead'),
  )
  return newLead?.id ?? stages[0].id
}

/**
 * Create or return an open lead (deal) for a contact.
 * One open deal per contact — matches AI lead-sync behaviour.
 */
export async function createLeadFromContact(
  supabase: SupabaseClient,
  userId: string,
  input: CreateLeadInput,
): Promise<CreateLeadResult> {
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, name')
    .eq('id', input.contactId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!contact) {
    throw new Error('Contact not found')
  }

  const { data: existing } = await supabase
    .from('deals')
    .select('id')
    .eq('user_id', userId)
    .eq('contact_id', input.contactId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return { dealId: existing.id, created: false }
  }

  const pipelineId = await resolveDefaultPipeline(
    supabase,
    userId,
    input.pipelineId,
  )
  if (!pipelineId) {
    throw new Error('No pipeline found. Create a pipeline first.')
  }

  const stageId = await resolveDefaultStage(
    supabase,
    pipelineId,
    input.stageId,
  )
  if (!stageId) {
    throw new Error('Pipeline has no stages.')
  }

  const title =
    input.title?.trim() ||
    (contact.name ? `Lead — ${contact.name}` : 'New Lead')

  const now = new Date().toISOString()
  const payload = {
    user_id: userId,
    pipeline_id: pipelineId,
    stage_id: stageId,
    contact_id: input.contactId,
    title,
    value: input.value ?? 0,
    currency: DEFAULT_DEAL_CURRENCY,
    status: 'open' as const,
    notes: input.notes?.trim() || null,
    lead_temperature: input.leadTemperature ?? null,
    lead_score: input.leadScore ?? null,
    lead_budget_inr: input.leadBudgetInr ?? null,
    qualified_at: input.leadTemperature ? now : null,
    updated_at: now,
  }

  const { data: deal, error } = await supabase
    .from('deals')
    .insert(payload)
    .select('id')
    .single()

  if (error || !deal) {
    throw new Error(error?.message ?? 'Failed to create lead')
  }

  return { dealId: deal.id, created: true }
}
