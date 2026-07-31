import type { SupabaseClient } from '@supabase/supabase-js'
import { isFollowUpOverdue } from './format-follow-up'
import { dealStatusForStageName } from './pipeline-stages'
import type {
  ContactLeadSummary,
  Lead,
  LeadQueryOptions,
  LeadStats,
  LeadStatusScope,
} from './types'

export const LEADS_PAGE_SIZE = 25

const LEAD_SELECT =
  '*, contact:contacts(*), stage:pipeline_stages(*), assignee:profiles!deals_assigned_to_fkey(*)'

export async function fetchLeadStats(
  supabase: SupabaseClient,
): Promise<LeadStats> {
  const [{ data: openRows, error: openErr }, { data: closedRows, error: closedErr }] =
    await Promise.all([
      supabase
        .from('deals')
        .select('lead_temperature, value, follow_up_at')
        .eq('status', 'open'),
      supabase.from('deals').select('status, value').in('status', ['won', 'lost']),
    ])

  if (openErr) throw new Error(openErr.message)
  if (closedErr) throw new Error(closedErr.message)

  const stats: LeadStats = {
    total: openRows?.length ?? 0,
    hot: 0,
    warm: 0,
    cold: 0,
    unqualified: 0,
    pipelineValue: 0,
    overdueFollowUps: 0,
    wonCount: 0,
    lostCount: 0,
    wonRevenue: 0,
  }

  const now = new Date()

  for (const row of openRows ?? []) {
    const t = row.lead_temperature
    if (t === 'hot') stats.hot++
    else if (t === 'warm') stats.warm++
    else if (t === 'cold') stats.cold++
    else stats.unqualified++

    stats.pipelineValue += Number(row.value) || 0

    if (isFollowUpOverdue(row.follow_up_at, now)) {
      stats.overdueFollowUps++
    }
  }

  for (const row of closedRows ?? []) {
    if (row.status === 'won') {
      stats.wonCount++
      stats.wonRevenue += Number(row.value) || 0
    } else if (row.status === 'lost') {
      stats.lostCount++
    }
  }

  return stats
}

function resolveStatusScope(
  options: LeadQueryOptions,
): LeadStatusScope | 'not_interested' {
  // Temperature / outcome filters that imply a status win over the scope tabs.
  if (options.filter === 'not_interested') return 'not_interested'
  if (options.filter === 'won') return 'won'
  if (options.filter === 'lost') return 'lost'
  if (options.filter === 'everything') return 'all'
  if (options.filter === 'overdue') return 'open'
  if (options.statusScope) return options.statusScope
  return 'open'
}

export async function fetchLeads(
  supabase: SupabaseClient,
  options: LeadQueryOptions,
): Promise<{ leads: Lead[]; total: number }> {
  const pageSize = options.pageSize ?? LEADS_PAGE_SIZE
  const from = options.page * pageSize
  const to = from + pageSize - 1
  const statusScope = resolveStatusScope(options)

  let query = supabase
    .from('deals')
    .select(LEAD_SELECT, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (statusScope === 'won') {
    query = query.eq('status', 'won')
  } else if (statusScope === 'lost' || statusScope === 'not_interested') {
    query = query.eq('status', 'lost')
  } else if (statusScope === 'all') {
    // No status filter — open + won + lost
  } else {
    query = query.eq('status', 'open')
  }

  const priority =
    options.priority && options.priority !== 'all'
      ? options.priority
      : options.filter === 'hot' ||
          options.filter === 'warm' ||
          options.filter === 'cold' ||
          options.filter === 'unqualified'
        ? options.filter
        : null

  if (priority === 'hot') {
    query = query.eq('lead_temperature', 'hot')
  } else if (priority === 'warm') {
    query = query.eq('lead_temperature', 'warm')
  } else if (priority === 'cold') {
    query = query.eq('lead_temperature', 'cold')
  } else if (priority === 'unqualified') {
    query = query.is('lead_temperature', null)
  } else if (options.filter === 'overdue') {
    query = query
      .eq('status', 'open')
      .not('follow_up_at', 'is', null)
      .lt('follow_up_at', new Date().toISOString())
  }

  if (options.stageId) {
    query = query.eq('stage_id', options.stageId)
  }

  if (options.assigneeId === 'unassigned') {
    query = query.is('assigned_to', null)
  } else if (options.assigneeId) {
    query = query.eq('assigned_to', options.assigneeId)
  }

  const term = options.search?.trim()
  if (term) {
    query = query.ilike('title', `%${term}%`)
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  let leads = (data ?? []) as Lead[]

  if (statusScope === 'not_interested' || options.filter === 'not_interested') {
    leads = leads.filter((l) =>
      (l.stage?.name ?? '').toLowerCase().includes('not interested'),
    )
  } else if (statusScope === 'lost' && options.filter === 'lost') {
    leads = leads.filter(
      (l) => !(l.stage?.name ?? '').toLowerCase().includes('not interested'),
    )
  }

  if (term) {
    const { data: contactMatches } = await supabase
      .from('contacts')
      .select('id')
      .or(
        `name.ilike.%${term}%,phone.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`,
      )

    const contactIds = (contactMatches ?? []).map((c) => c.id)
    if (contactIds.length > 0) {
      let contactQuery = supabase
        .from('deals')
        .select(LEAD_SELECT)
        .in('contact_id', contactIds.slice(0, 200))
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (statusScope === 'won') {
        contactQuery = contactQuery.eq('status', 'won')
      } else if (statusScope === 'lost' || statusScope === 'not_interested') {
        contactQuery = contactQuery.eq('status', 'lost')
      } else if (statusScope !== 'all') {
        contactQuery = contactQuery.eq('status', 'open')
      }

      if (options.stageId) {
        contactQuery = contactQuery.eq('stage_id', options.stageId)
      }
      if (options.assigneeId === 'unassigned') {
        contactQuery = contactQuery.is('assigned_to', null)
      } else if (options.assigneeId) {
        contactQuery = contactQuery.eq('assigned_to', options.assigneeId)
      }

      const { data: byContact } = await contactQuery
      if (byContact?.length) {
        const seen = new Set(leads.map((l) => l.id))
        for (const row of byContact as Lead[]) {
          if (!seen.has(row.id)) leads.push(row)
        }
      }
    }
  }

  return { leads, total: count ?? leads.length }
}

/** Latest open deal per contact — for contacts list sync. */
export async function fetchContactLeadSummaries(
  supabase: SupabaseClient,
  contactIds: string[],
): Promise<Map<string, ContactLeadSummary>> {
  const map = new Map<string, ContactLeadSummary>()
  if (contactIds.length === 0) return map

  const PAGE = 500
  for (let i = 0; i < contactIds.length; i += PAGE) {
    const slice = contactIds.slice(i, i + PAGE)
    const { data } = await supabase
      .from('deals')
      .select('id, contact_id, title, lead_temperature, lead_score, updated_at')
      .in('contact_id', slice)
      .eq('status', 'open')
      .order('updated_at', { ascending: false })

    for (const row of data ?? []) {
      if (!row.contact_id || map.has(row.contact_id)) continue
      map.set(row.contact_id, {
        dealId: row.id,
        title: row.title,
        lead_temperature: row.lead_temperature,
        lead_score: row.lead_score,
      })
    }
  }

  return map
}

export async function updateLeadStage(
  supabase: SupabaseClient,
  dealId: string,
  stageId: string,
  options?: { stageName?: string },
): Promise<{ status: 'open' | 'won' | 'lost' }> {
  const status = options?.stageName
    ? dealStatusForStageName(options.stageName)
    : 'open'

  const { error } = await supabase
    .from('deals')
    .update({
      stage_id: stageId,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId)

  if (error) throw new Error(error.message)
  return { status }
}
