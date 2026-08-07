import type { SupabaseClient } from '@supabase/supabase-js';
import { startOfLocalDay } from './date-utils';
import { formatLeadSource } from '@/lib/leads/sources';

type DB = SupabaseClient;

/** A lead as rendered by the sales-activity widgets (follow-ups, hot clients). */
export interface ActivityLeadRow {
  id: string;
  title: string;
  value: number;
  contactName: string | null;
  contactPhone: string | null;
  company: string | null;
  conversationId: string | null;
  temperature: string | null;
  score: number | null;
  stageName: string | null;
  stageColor: string | null;
  followUpAt: string | null;
}

export interface LeadSourceSlice {
  key: string;
  label: string;
  color: string;
  count: number;
  value: number;
  /** Share of total leads, 0-100, rounded. */
  pct: number;
}

/** Month-to-date outcome mix powering the performance donut. */
export interface MonthPerformance {
  newLeads: number;
  qualified: number;
  /** Leads AI-qualified since midnight. */
  qualifiedToday: number;
  won: number;
  lost: number;
  openLeads: number;
  wonRevenue: number;
  /** Won / (won + lost) as a percentage. Null when nothing closed yet. */
  closeRate: number | null;
  /** Won / new leads created this month. Null when no new leads. */
  conversionRate: number | null;
}

export interface SalesActivityBundle {
  todayFollowUps: ActivityLeadRow[];
  upcomingFollowUps: ActivityLeadRow[];
  overdueFollowUps: ActivityLeadRow[];
  hotClients: ActivityLeadRow[];
  sources: { slices: LeadSourceSlice[]; totalCount: number };
  performance: MonthPerformance;
}

const SOURCE_PALETTE = [
  '#7c3aed',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#6366f1',
  '#14b8a6',
  '#a855f7',
];

type RawDeal = {
  id: string;
  title: string;
  value: number | null;
  follow_up_at: string | null;
  lead_temperature: string | null;
  lead_score: number | null;
  conversation_id: string | null;
  contact:
    | { name: string | null; company: string | null; phone: string | null }
    | { name: string | null; company: string | null; phone: string | null }[]
    | null;
  stage:
    | { name: string; color: string }
    | { name: string; color: string }[]
    | null;
};

const DEAL_SELECT =
  'id, title, value, follow_up_at, lead_temperature, lead_score, conversation_id, contact:contacts(name, company, phone), stage:pipeline_stages(name, color)';

function toRow(raw: RawDeal): ActivityLeadRow {
  const contact = Array.isArray(raw.contact) ? raw.contact[0] : raw.contact;
  const stage = Array.isArray(raw.stage) ? raw.stage[0] : raw.stage;
  return {
    id: raw.id,
    title: raw.title,
    value: Number(raw.value) || 0,
    contactName: contact?.name ?? null,
    contactPhone: contact?.phone ?? null,
    company: contact?.company ?? null,
    conversationId: raw.conversation_id ?? null,
    temperature: raw.lead_temperature,
    score: raw.lead_score,
    stageName: stage?.name ?? null,
    stageColor: stage?.color ?? null,
    followUpAt: raw.follow_up_at,
  };
}

function startOfMonth(): Date {
  const d = startOfLocalDay();
  d.setDate(1);
  return d;
}

/**
 * Sales-activity view-model: what the rep should act on today, who is
 * hottest, where leads come from, and how the month is closing.
 *
 * Everything is derived from `deals` — the CRM has no call log or
 * meetings table, so those reference-style widgets are intentionally
 * expressed as follow-ups and pipeline outcomes instead.
 */
export async function loadSalesActivity(db: DB): Promise<SalesActivityBundle> {
  const dayStart = startOfLocalDay();
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const weekEnd = new Date(dayStart);
  weekEnd.setDate(weekEnd.getDate() + 8);
  const monthStart = startOfMonth();

  const [followUpsRes, hotRes, allDealsRes, openRes] = await Promise.all([
    db
      .from('deals')
      .select(DEAL_SELECT)
      .eq('status', 'open')
      .not('follow_up_at', 'is', null)
      .lt('follow_up_at', weekEnd.toISOString())
      .order('follow_up_at', { ascending: true })
      .limit(60),
    db
      .from('deals')
      .select(DEAL_SELECT)
      .eq('status', 'open')
      .not('lead_score', 'is', null)
      .order('lead_score', { ascending: false })
      .limit(6),
    // One pass over the deal ledger feeds both the source mix and the
    // month-to-date outcome counters.
    db
      .from('deals')
      .select('id, source, value, status, created_at, updated_at, qualified_at')
      .order('created_at', { ascending: false })
      .limit(2000),
    db
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
  ]);

  if (followUpsRes.error) throw followUpsRes.error;

  const followUps = ((followUpsRes.data ?? []) as unknown as RawDeal[]).map(
    toRow
  );

  const todayFollowUps: ActivityLeadRow[] = [];
  const upcomingFollowUps: ActivityLeadRow[] = [];
  const overdueFollowUps: ActivityLeadRow[] = [];

  for (const row of followUps) {
    if (!row.followUpAt) continue;
    const at = new Date(row.followUpAt).getTime();
    if (at < dayStart.getTime()) overdueFollowUps.push(row);
    else if (at < dayEnd.getTime()) todayFollowUps.push(row);
    else upcomingFollowUps.push(row);
  }

  const hotClients = ((hotRes.data ?? []) as unknown as RawDeal[]).map(toRow);

  type LedgerDeal = {
    source: string | null;
    status: string | null;
    value: number | null;
    created_at: string | null;
    updated_at: string | null;
    qualified_at: string | null;
  };
  const ledger = (allDealsRes.data ?? []) as unknown as LedgerDeal[];

  // --- Lead sources (real deals.source column) ---
  const bySource = new Map<string, { count: number; value: number }>();
  for (const d of ledger) {
    const key = d.source?.trim() || 'unknown';
    const acc = bySource.get(key) ?? { count: 0, value: 0 };
    acc.count += 1;
    acc.value += Number(d.value) || 0;
    bySource.set(key, acc);
  }
  const totalCount = ledger.length;
  const slices: LeadSourceSlice[] = [...bySource.entries()]
    .map(([key, acc]) => ({
      key,
      label: key === 'unknown' ? 'Unknown' : formatLeadSource(key),
      color: '',
      count: acc.count,
      value: acc.value,
      pct: totalCount > 0 ? Math.round((acc.count / totalCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .map((slice, i) => ({
      ...slice,
      color: SOURCE_PALETTE[i % SOURCE_PALETTE.length],
    }));

  // --- Month performance ---
  const monthStartMs = monthStart.getTime();
  const inMonth = (iso: string | null) =>
    !!iso && new Date(iso).getTime() >= monthStartMs;

  let newLeads = 0;
  let qualified = 0;
  let qualifiedToday = 0;
  let won = 0;
  let lost = 0;
  let wonRevenue = 0;

  for (const d of ledger) {
    if (inMonth(d.created_at)) newLeads += 1;
    if (inMonth(d.qualified_at)) {
      qualified += 1;
      if (new Date(d.qualified_at!).getTime() >= dayStart.getTime()) {
        qualifiedToday += 1;
      }
    }
    if (d.status === 'won' && inMonth(d.updated_at)) {
      won += 1;
      wonRevenue += Number(d.value) || 0;
    }
    if (d.status === 'lost' && inMonth(d.updated_at)) lost += 1;
  }

  const closed = won + lost;
  const performance: MonthPerformance = {
    newLeads,
    qualified,
    qualifiedToday,
    won,
    lost,
    openLeads: openRes.count ?? 0,
    wonRevenue,
    closeRate: closed > 0 ? Math.round((won / closed) * 100) : null,
    conversionRate: newLeads > 0 ? Math.round((won / newLeads) * 100) : null,
  };

  return {
    todayFollowUps,
    upcomingFollowUps,
    overdueFollowUps,
    hotClients,
    sources: { slices, totalCount },
    performance,
  };
}
