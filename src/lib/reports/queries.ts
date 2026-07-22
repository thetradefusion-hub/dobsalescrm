import type { SupabaseClient } from '@supabase/supabase-js'
import { localDayKey } from '@/lib/dashboard/date-utils'
import type { PipelineDonutData, PipelineStageSlice } from '@/lib/dashboard/types'
import type { ResolvedReportRange } from './date-range'
import type {
  DealsTrendPoint,
  MessagesTrendPoint,
  ReportDealRow,
  ReportMetricDelta,
  ReportsBundle,
  ReportSummary,
  StageBarSlice,
  TemperatureSlice,
} from './types'

type DB = SupabaseClient

type DealRowRaw = {
  id: string
  title: string
  value: number | null
  currency: string | null
  status: string
  lead_temperature: string | null
  stage_id: string
  contact_id: string | null
  created_at: string
  updated_at: string
  contact?: { name: string | null } | { name: string | null }[] | null
  stage?: { name: string; color: string } | { name: string; color: string }[] | null
}

type DealRow = Omit<DealRowRaw, 'contact' | 'stage'> & {
  contact?: { name: string | null } | null
  stage?: { name: string; color: string } | null
}

function normalizeDealRow(row: DealRowRaw): DealRow {
  const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact
  const stage = Array.isArray(row.stage) ? row.stage[0] : row.stage
  return { ...row, contact: contact ?? null, stage: stage ?? null }
}

function inRange(iso: string, fromIso: string, toIso: string): boolean {
  return iso >= fromIso && iso < toIso
}

function delta(current: number, previous: number): ReportMetricDelta {
  return { current, previous }
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100)
}

export function formatDeltaLabel(current: number, previous: number): string {
  const diff = current - previous
  const pct = pctChange(current, previous)
  if (pct === null) {
    return diff === 0 ? 'Same as previous period' : `${diff >= 0 ? '+' : ''}${diff} vs prev`
  }
  return `${diff >= 0 ? '+' : ''}${diff} (${pct >= 0 ? '+' : ''}${pct}%) vs prev`
}

export async function loadReportsBundle(
  db: DB,
  range: ResolvedReportRange,
): Promise<ReportsBundle> {
  const { fromIso, toIso, prevFromIso, prevToIso, dayKeys } = range

  const [
    dealsRes,
    messagesRes,
    prevMessagesRes,
    contactsCur,
    contactsPrev,
    broadcastsCur,
    broadcastsPrev,
    stagesRes,
  ] = await Promise.all([
    db
      .from('deals')
      .select(
        'id, title, value, currency, status, lead_temperature, stage_id, contact_id, created_at, updated_at, contact:contacts(name), stage:pipeline_stages(name, color)',
      )
      .order('created_at', { ascending: false }),
    db
      .from('messages')
      .select('created_at, sender_type')
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
    db
      .from('messages')
      .select('created_at, sender_type')
      .gte('created_at', prevFromIso)
      .lt('created_at', prevToIso),
    db
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
    db
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', prevFromIso)
      .lt('created_at', prevToIso),
    db
      .from('broadcasts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('updated_at', fromIso)
      .lt('updated_at', toIso),
    db
      .from('broadcasts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('updated_at', prevFromIso)
      .lt('updated_at', prevToIso),
    db
      .from('pipeline_stages')
      .select('id, name, color, pipeline_id, position')
      .order('position'),
  ])

  if (dealsRes.error) throw new Error(dealsRes.error.message)
  if (messagesRes.error) throw new Error(messagesRes.error.message)

  const deals = ((dealsRes.data ?? []) as DealRowRaw[]).map(normalizeDealRow)
  const stages = (stagesRes.data ?? []) as {
    id: string
    name: string
    color: string
  }[]

  const createdInRange = deals.filter((d) => inRange(d.created_at, fromIso, toIso))
  const createdPrev = deals.filter((d) => inRange(d.created_at, prevFromIso, prevToIso))
  const wonInRange = deals.filter(
    (d) => d.status === 'won' && inRange(d.updated_at, fromIso, toIso),
  )
  const wonPrev = deals.filter(
    (d) => d.status === 'won' && inRange(d.updated_at, prevFromIso, prevToIso),
  )
  const lostInRange = deals.filter(
    (d) => d.status === 'lost' && inRange(d.updated_at, fromIso, toIso),
  )
  const lostPrev = deals.filter(
    (d) => d.status === 'lost' && inRange(d.updated_at, prevFromIso, prevToIso),
  )
  const openDeals = deals.filter((d) => d.status === 'open')

  const revenueWon = wonInRange.reduce((s, d) => s + (d.value ?? 0), 0)
  const revenueWonPrev = wonPrev.reduce((s, d) => s + (d.value ?? 0), 0)
  const openPipelineValue = openDeals.reduce((s, d) => s + (d.value ?? 0), 0)
  const avgDealValue =
    createdInRange.length > 0
      ? createdInRange.reduce((s, d) => s + (d.value ?? 0), 0) / createdInRange.length
      : 0

  const closedCount = wonInRange.length + lostInRange.length
  const conversionRate =
    closedCount > 0 ? Math.round((wonInRange.length / closedCount) * 100) : null

  const { sent: msgSent, received: msgReceived } = countMessages(
    (messagesRes.data ?? []) as { created_at: string; sender_type: string }[],
  )
  const { sent: msgSentPrev, received: msgReceivedPrev } = countMessages(
    (prevMessagesRes.data ?? []) as { created_at: string; sender_type: string }[],
  )

  const summary: ReportSummary = {
    newLeads: delta(createdInRange.length, createdPrev.length),
    wonDeals: delta(wonInRange.length, wonPrev.length),
    lostDeals: delta(lostInRange.length, lostPrev.length),
    revenueWon: delta(revenueWon, revenueWonPrev),
    newContacts: delta(contactsCur.count ?? 0, contactsPrev.count ?? 0),
    messagesSent: delta(msgSent, msgSentPrev),
    messagesReceived: delta(msgReceived, msgReceivedPrev),
    openPipelineValue,
    openDealsCount: openDeals.length,
    conversionRate,
    avgDealValue,
    broadcastsSent: delta(broadcastsCur.count ?? 0, broadcastsPrev.count ?? 0),
  }

  const dealsTrend = buildDealsTrend(deals, dayKeys, fromIso, toIso)
  const messagesTrend = buildMessagesTrend(
    (messagesRes.data ?? []) as { created_at: string; sender_type: string }[],
    dayKeys,
  )
  const temperatureBreakdown = buildTemperatureBreakdown(createdInRange)
  const newLeadsByStage = buildStageBars(createdInRange, stages)
  const pipelineSnapshot = buildPipelineSnapshot(openDeals, stages)
  const topDeals = mapDealRows(
    [...createdInRange].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 8),
  )
  const recentClosed = mapDealRows(
    [...wonInRange, ...lostInRange]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 8),
  )

  return {
    rangeLabel: range.label,
    preset: range.preset,
    summary,
    dealsTrend,
    messagesTrend,
    temperatureBreakdown,
    newLeadsByStage,
    pipelineSnapshot,
    topDeals,
    recentClosed,
  }
}

function countMessages(rows: { created_at: string; sender_type: string }[]) {
  let sent = 0
  let received = 0
  for (const row of rows) {
    if (row.sender_type === 'customer') received++
    else sent++
  }
  return { sent, received }
}

function buildDealsTrend(
  deals: DealRow[],
  dayKeys: string[],
  fromIso: string,
  toIso: string,
): DealsTrendPoint[] {
  const buckets = new Map<string, { created: number; won: number; lost: number }>()
  for (const k of dayKeys) buckets.set(k, { created: 0, won: 0, lost: 0 })

  for (const d of deals) {
    if (inRange(d.created_at, fromIso, toIso)) {
      const b = buckets.get(localDayKey(d.created_at))
      if (b) b.created++
    }
    if (d.status === 'won' && inRange(d.updated_at, fromIso, toIso)) {
      const b = buckets.get(localDayKey(d.updated_at))
      if (b) b.won++
    }
    if (d.status === 'lost' && inRange(d.updated_at, fromIso, toIso)) {
      const b = buckets.get(localDayKey(d.updated_at))
      if (b) b.lost++
    }
  }

  return dayKeys.map((day) => ({ day, ...(buckets.get(day) ?? { created: 0, won: 0, lost: 0 }) }))
}

function buildMessagesTrend(
  rows: { created_at: string; sender_type: string }[],
  dayKeys: string[],
): MessagesTrendPoint[] {
  const buckets = new Map<string, { incoming: number; outgoing: number }>()
  for (const k of dayKeys) buckets.set(k, { incoming: 0, outgoing: 0 })

  for (const row of rows) {
    const key = localDayKey(row.created_at)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (row.sender_type === 'customer') bucket.incoming++
    else bucket.outgoing++
  }

  return dayKeys.map((day) => ({
    day,
    ...(buckets.get(day) ?? { incoming: 0, outgoing: 0 }),
  }))
}

function buildTemperatureBreakdown(deals: DealRow[]): TemperatureSlice[] {
  const counts = { hot: 0, warm: 0, cold: 0, unqualified: 0 }
  for (const d of deals) {
    const t = d.lead_temperature
    if (t === 'hot') counts.hot++
    else if (t === 'warm') counts.warm++
    else if (t === 'cold') counts.cold++
    else counts.unqualified++
  }
  return [
    { key: 'hot', label: 'Hot', count: counts.hot, color: '#ef4444' },
    { key: 'warm', label: 'Warm', count: counts.warm, color: '#f97316' },
    { key: 'cold', label: 'Cold', count: counts.cold, color: '#3b82f6' },
    {
      key: 'unqualified',
      label: 'Unqualified',
      count: counts.unqualified,
      color: '#94a3b8',
    },
  ]
}

function buildStageBars(deals: DealRow[], stages: { id: string; name: string; color: string }[]): StageBarSlice[] {
  const byStage = new Map<string, { count: number; value: number }>()
  for (const d of deals) {
    const row = byStage.get(d.stage_id) ?? { count: 0, value: 0 }
    row.count++
    row.value += d.value ?? 0
    byStage.set(d.stage_id, row)
  }

  return stages
    .map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#64748b',
      count: byStage.get(s.id)?.count ?? 0,
      value: byStage.get(s.id)?.value ?? 0,
    }))
    .filter((s) => s.count > 0)
}

function buildPipelineSnapshot(
  openDeals: DealRow[],
  stages: { id: string; name: string; color: string }[],
): PipelineDonutData {
  const byStage = new Map<string, { count: number; total: number }>()
  for (const d of openDeals) {
    const row = byStage.get(d.stage_id) ?? { count: 0, total: 0 }
    row.count++
    row.total += d.value ?? 0
    byStage.set(d.stage_id, row)
  }

  const slices: PipelineStageSlice[] = stages
    .map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#64748b',
      dealCount: byStage.get(s.id)?.count ?? 0,
      totalValue: byStage.get(s.id)?.total ?? 0,
    }))
    .filter((s) => s.dealCount > 0 || s.totalValue > 0)

  return {
    stages: slices,
    totalValue: openDeals.reduce((s, d) => s + (d.value ?? 0), 0),
  }
}

function mapDealRows(deals: DealRow[]): ReportDealRow[] {
  return deals.map((d) => ({
    id: d.id,
    title: d.title,
    value: d.value ?? 0,
    currency: d.currency,
    status: d.status,
    lead_temperature: d.lead_temperature,
    stage_name: d.stage?.name ?? null,
    stage_color: d.stage?.color ?? null,
    contact_name: d.contact?.name ?? null,
    created_at: d.created_at,
    updated_at: d.updated_at,
  }))
}
