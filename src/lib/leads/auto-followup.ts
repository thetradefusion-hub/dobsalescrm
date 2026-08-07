import type { SupabaseClient } from '@supabase/supabase-js'
import { createTask, updateTask } from '@/lib/tasks/queries'
import { updateLeadFollowUp } from '@/lib/leads/queries'

export const AUTO_FOLLOWUP_TASK_MARKER = '[auto-followup]'

export const FOLLOWUP_PRESETS = [
  { id: 'today', label: 'Today (evening)', days: 0, hour: 18 },
  { id: '1d', label: 'Tomorrow', days: 1, hour: 10 },
  { id: '2d', label: 'In 2 days', days: 2, hour: 10 },
  { id: '3d', label: 'In 3 days', days: 3, hour: 10 },
  { id: '7d', label: 'In 1 week', days: 7, hour: 10 },
] as const

export type FollowUpPresetId = (typeof FOLLOWUP_PRESETS)[number]['id']

export function dueAtFromPreset(presetId: FollowUpPresetId): string {
  const preset =
    FOLLOWUP_PRESETS.find((p) => p.id === presetId) ?? FOLLOWUP_PRESETS[1]
  const d = new Date()
  d.setDate(d.getDate() + preset.days)
  d.setHours(preset.hour, 0, 0, 0)
  // If "today evening" already passed, push to tomorrow 10:00
  if (preset.id === 'today' && d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
  }
  return d.toISOString()
}

export type AutoFollowUpLead = {
  id: string
  title: string
  contact_id: string | null
  assigned_to?: string | null
  contactName?: string | null
}

/**
 * Enable: set follow_up_at + create/refresh a Tasks row for the assignee.
 * Disable: clear follow_up_at + cancel open auto-followup tasks for the deal.
 * Does not send WhatsApp — sales reminder via CRM Tasks / dashboard.
 */
export async function setLeadAutoFollowUp(
  supabase: SupabaseClient,
  authUserId: string,
  lead: AutoFollowUpLead,
  enabled: boolean,
  options?: { dueAt?: string; presetId?: FollowUpPresetId },
): Promise<{ follow_up_at: string | null }> {
  if (!enabled) {
    await updateLeadFollowUp(supabase, lead.id, null)
    await cancelAutoFollowUpTasks(supabase, lead.id)
    return { follow_up_at: null }
  }

  const dueAt =
    options?.dueAt ??
    dueAtFromPreset(options?.presetId ?? '1d')

  await updateLeadFollowUp(supabase, lead.id, dueAt)
  await upsertAutoFollowUpTask(supabase, authUserId, lead, dueAt)
  return { follow_up_at: dueAt }
}

async function cancelAutoFollowUpTasks(
  supabase: SupabaseClient,
  dealId: string,
): Promise<void> {
  const { data } = await supabase
    .from('tasks')
    .select('id')
    .eq('deal_id', dealId)
    .ilike('description', `${AUTO_FOLLOWUP_TASK_MARKER}%`)
    .in('status', ['todo', 'in_progress'])

  for (const row of data ?? []) {
    await updateTask(supabase, row.id, { status: 'cancelled' })
  }
}

async function upsertAutoFollowUpTask(
  supabase: SupabaseClient,
  authUserId: string,
  lead: AutoFollowUpLead,
  dueAt: string,
): Promise<void> {
  const who =
    lead.contactName?.trim() ||
    lead.title?.trim() ||
    'Lead'
  const title = `Follow up — ${who}`
  const description = `${AUTO_FOLLOWUP_TASK_MARKER} Auto follow-up for this lead.`

  const { data: existing } = await supabase
    .from('tasks')
    .select('id')
    .eq('deal_id', lead.id)
    .ilike('description', `${AUTO_FOLLOWUP_TASK_MARKER}%`)
    .in('status', ['todo', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    await updateTask(supabase, existing.id, {
      title,
      description,
      due_at: dueAt,
      assigned_to: lead.assigned_to ?? null,
      contact_id: lead.contact_id,
      deal_id: lead.id,
      priority: 'high',
      status: 'todo',
    })
    return
  }

  await createTask(supabase, authUserId, {
    title,
    description,
    due_at: dueAt,
    assigned_to: lead.assigned_to ?? null,
    contact_id: lead.contact_id,
    deal_id: lead.id,
    priority: 'high',
    status: 'todo',
  })
}
