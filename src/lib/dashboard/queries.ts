import type { SupabaseClient } from '@supabase/supabase-js';
import {
  daysAgoStart,
  DOW_SHORT_MON_FIRST,
  lastNDayKeys,
  localDayKey,
  mondayIndex,
  startOfLocalDay,
} from './date-utils';
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  DashboardLeadRow,
  MetricsBundle,
  PipelineDonutData,
  PipelineStageSlice,
  ResponseTimeBucket,
  ResponseTimeSummary,
} from './types';
import {
  isFollowUpDueToday,
  isFollowUpOverdue,
} from '@/lib/leads/format-follow-up';
import { resolveReportRange } from '@/lib/reports/date-range';
import { formatDeltaLabel, loadReportsBundle } from '@/lib/reports/queries';
import { loadSalesActivity } from './sales-activity';

// ------------------------------------------------------------
// All client-side aggregation. RLS scopes every query to the
// signed-in user automatically, so we never pass user_id explicitly
// here. Perf is acceptable for the current scale (low thousands of
// messages) — if a tenant's dataset outgrows this, we'd migrate the
// heavy aggregations to SQL RPCs. Noted in the PR.
// ------------------------------------------------------------

type DB = SupabaseClient;

// --- 1. Metric cards ---------------------------------------------------

export async function loadMetrics(db: DB): Promise<MetricsBundle> {
  const todayStart = startOfLocalDay().toISOString();
  const yesterdayStart = daysAgoStart(1).toISOString();

  const [
    openConvCur,
    newConvToday,
    newConvYesterday,
    newContactsToday,
    newContactsYesterday,
    openDeals,
    messagesToday,
    messagesYesterday,
  ] = await Promise.all([
    db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .gte('created_at', todayStart),
    db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .gte('created_at', yesterdayStart)
      .lt('created_at', todayStart),
    db
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    db
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterdayStart)
      .lt('created_at', todayStart),
    db
      .from('deals')
      .select('value, status, lead_temperature, follow_up_at')
      .eq('status', 'open'),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('sender_type', ['agent', 'bot'])
      .gte('created_at', todayStart),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('sender_type', ['agent', 'bot'])
      .gte('created_at', yesterdayStart)
      .lt('created_at', todayStart),
  ]);

  const openDealsRows = (openDeals.data ?? []) as {
    value: number | null;
    lead_temperature: string | null;
    follow_up_at: string | null;
  }[];
  const openDealsValue = openDealsRows.reduce(
    (sum, d) => sum + (d.value ?? 0),
    0
  );
  const now = new Date();
  let leadsHot = 0;
  let leadsOverdue = 0;
  for (const d of openDealsRows) {
    if (d.lead_temperature === 'hot') leadsHot++;
    if (isFollowUpOverdue(d.follow_up_at, now)) leadsOverdue++;
  }

  return {
    activeConversations: {
      current: openConvCur.count ?? 0,
      // "vs yesterday" on a current-state count has no clean answer
      // without snapshots — we show the delta in NEW open conversations
      // today vs yesterday. That's the business-meaningful daily signal.
      previous: (newConvToday.count ?? 0) - (newConvYesterday.count ?? 0),
    },
    newContactsToday: {
      current: newContactsToday.count ?? 0,
      previous: newContactsYesterday.count ?? 0,
    },
    openDealsValue,
    openDealsCount: openDealsRows.length,
    messagesSentToday: {
      current: messagesToday.count ?? 0,
      previous: messagesYesterday.count ?? 0,
    },
    leadsTotal: openDealsRows.length,
    leadsHot,
    leadsOverdue,
  };
}

// --- 2. Conversations over time ---------------------------------------

export async function loadConversationsSeries(
  db: DB,
  rangeDays: number
): Promise<ConversationsSeriesPoint[]> {
  const start = daysAgoStart(rangeDays - 1).toISOString();
  const { data, error } = await db
    .from('messages')
    .select('created_at, sender_type')
    .gte('created_at', start)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const keys = lastNDayKeys(rangeDays);
  const buckets = new Map<string, { incoming: number; outgoing: number }>();
  for (const k of keys) buckets.set(k, { incoming: 0, outgoing: 0 });

  for (const row of (data ?? []) as {
    created_at: string;
    sender_type: string;
  }[]) {
    const key = localDayKey(row.created_at);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (row.sender_type === 'customer') bucket.incoming += 1;
    else bucket.outgoing += 1; // agent + bot both count as outgoing
  }

  return keys.map((day) => ({
    day,
    ...(buckets.get(day) ?? { incoming: 0, outgoing: 0 }),
  }));
}

// --- 3. Pipeline donut -------------------------------------------------

export async function loadPipelineDonut(db: DB): Promise<PipelineDonutData> {
  const [stagesRes, dealsRes] = await Promise.all([
    db
      .from('pipeline_stages')
      .select('id, name, color, pipeline_id, position')
      .order('position'),
    db.from('deals').select('stage_id, value, status').eq('status', 'open'),
  ]);

  const stages = (stagesRes.data ?? []) as {
    id: string;
    name: string;
    color: string;
  }[];
  const deals = (dealsRes.data ?? []) as {
    stage_id: string;
    value: number | null;
  }[];

  const byStage = new Map<string, { count: number; total: number }>();
  for (const d of deals) {
    const row = byStage.get(d.stage_id) ?? { count: 0, total: 0 };
    row.count += 1;
    row.total += d.value ?? 0;
    byStage.set(d.stage_id, row);
  }

  const slices: PipelineStageSlice[] = stages
    .map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#64748b',
      dealCount: byStage.get(s.id)?.count ?? 0,
      totalValue: byStage.get(s.id)?.total ?? 0,
    }))
    // Hide empty stages from the ring (but we'd still show them in the
    // legend if the user wanted a full breakdown — trimming keeps the
    // visual clean for the common case).
    .filter((s) => s.totalValue > 0 || s.dealCount > 0);

  return {
    stages: slices,
    totalValue: slices.reduce((sum, s) => sum + s.totalValue, 0),
  };
}

// --- 4. Response time by day of week ----------------------------------

export async function loadResponseTime(db: DB): Promise<ResponseTimeSummary> {
  // Pull the last 14 days of messages in one shot, then walk per
  // conversation to find each "first inbound" → "first subsequent
  // outbound" pair. 14 days gives us both "this week" + "last week"
  // with enough overlap if the user opens the dashboard late on a
  // Monday.
  const fourteenDaysAgo = daysAgoStart(13).toISOString();
  const { data, error } = await db
    .from('messages')
    .select('conversation_id, sender_type, created_at')
    .gte('created_at', fourteenDaysAgo)
    .order('conversation_id', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as {
    conversation_id: string;
    sender_type: string;
    created_at: string;
  }[];

  // Group per conversation, pair unreplied customer messages with the
  // next outbound message from the agent/bot. A single customer message
  // can only count once (avoids inflating averages if the customer
  // double-messages while the agent takes time to reply).
  interface Sample {
    customerAt: Date;
    responseAt: Date;
  }
  const samples: Sample[] = [];

  let currentConv = '';
  let pendingCustomer: Date | null = null;
  for (const row of rows) {
    if (row.conversation_id !== currentConv) {
      currentConv = row.conversation_id;
      pendingCustomer = null;
    }
    const ts = new Date(row.created_at);
    if (row.sender_type === 'customer') {
      if (!pendingCustomer) pendingCustomer = ts;
    } else if (pendingCustomer) {
      samples.push({ customerAt: pendingCustomer, responseAt: ts });
      pendingCustomer = null;
    }
  }

  const now = new Date();
  const thisWeekStart = daysAgoStart(mondayIndex(now));
  const lastWeekStart = daysAgoStart(mondayIndex(now) + 7);

  // Per-day-of-week buckets, averaged over both weeks' worth of data
  // so each bar has more samples to stand on. If a day has no samples
  // its avgMinutes stays null and the chart renders the bar muted.
  const byDow = new Map<number, number[]>();
  for (let i = 0; i < 7; i++) byDow.set(i, []);
  const thisWeekMins: number[] = [];
  const lastWeekMins: number[] = [];

  for (const s of samples) {
    const diffMin = (s.responseAt.getTime() - s.customerAt.getTime()) / 60_000;
    if (diffMin < 0) continue;
    const dow = mondayIndex(s.customerAt);
    byDow.get(dow)!.push(diffMin);
    if (s.customerAt >= thisWeekStart) {
      thisWeekMins.push(diffMin);
    } else if (s.customerAt >= lastWeekStart && s.customerAt < thisWeekStart) {
      lastWeekMins.push(diffMin);
    }
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

  const buckets: ResponseTimeBucket[] = Array.from({ length: 7 }, (_, dow) => {
    const samples = byDow.get(dow) ?? [];
    return {
      dow,
      avgMinutes: avg(samples),
      samples: samples.length,
    };
  });

  // Silence unused-label warnings — keep the arrays explicitly named
  // for readability above.
  void DOW_SHORT_MON_FIRST;

  return {
    buckets,
    thisWeekAvg: avg(thisWeekMins),
    lastWeekAvg: avg(lastWeekMins),
  };
}

// --- 5. Activity feed --------------------------------------------------

export async function loadActivity(
  db: DB,
  limit = 20
): Promise<ActivityItem[]> {
  // Pull ~10 from each source (plenty of headroom after merge-sort),
  // then interleave by timestamp. The individual per-table limits
  // keep the payload small; the final limit is enforced after sort.
  const [msgs, contacts, deals, broadcasts, autoLogs] = await Promise.all([
    db
      .from('messages')
      .select(
        'id, content_text, sender_type, created_at, conversation_id, conversations(contact_id, contacts(name, phone))'
      )
      .eq('sender_type', 'customer')
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('contacts')
      .select('id, name, phone, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('deals')
      .select('id, title, updated_at, stage:pipeline_stages(name)')
      .order('updated_at', { ascending: false })
      .limit(10),
    db
      .from('broadcasts')
      .select('id, name, status, total_recipients, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    db
      .from('automation_logs')
      .select(
        'id, trigger_event, status, created_at, automation:automations(name), contact:contacts(name, phone)'
      )
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const items: ActivityItem[] = [];

  // PostgREST returns nested selections as arrays by default, even when
  // the foreign key is 1:1. We normalise by taking [0] on each level.
  for (const m of (msgs.data ?? []) as unknown as Array<{
    id: string;
    content_text: string | null;
    created_at: string;
    conversation_id: string;
    conversations:
      | {
          contact_id: string | null;
          contacts:
            | { name: string | null; phone: string }[]
            | { name: string | null; phone: string }
            | null;
        }[]
      | {
          contact_id: string | null;
          contacts:
            | { name: string | null; phone: string }[]
            | { name: string | null; phone: string }
            | null;
        }
      | null;
  }>) {
    const conv = Array.isArray(m.conversations)
      ? m.conversations[0]
      : m.conversations;
    const contact = Array.isArray(conv?.contacts)
      ? conv?.contacts[0]
      : conv?.contacts;
    const who = contact?.name || contact?.phone || 'Unknown';
    items.push({
      id: `msg-${m.id}`,
      kind: 'message',
      text: `New message from ${who}`,
      at: m.created_at,
      href: `/inbox?c=${m.conversation_id}`,
    });
  }

  for (const c of (contacts.data ?? []) as Array<{
    id: string;
    name: string | null;
    phone: string;
    created_at: string;
  }>) {
    items.push({
      id: `contact-${c.id}`,
      kind: 'contact',
      text: `New contact: ${c.name || c.phone}`,
      at: c.created_at,
      href: '/contacts',
    });
  }

  for (const d of (deals.data ?? []) as unknown as Array<{
    id: string;
    title: string;
    updated_at: string;
    stage: { name: string }[] | { name: string } | null;
  }>) {
    const stage = Array.isArray(d.stage) ? d.stage[0] : d.stage;
    items.push({
      id: `deal-${d.id}`,
      kind: 'deal',
      text: stage?.name
        ? `Deal "${d.title}" in ${stage.name}`
        : `Deal "${d.title}" updated`,
      at: d.updated_at,
      href: '/pipelines',
    });
  }

  for (const b of (broadcasts.data ?? []) as Array<{
    id: string;
    name: string;
    status: string;
    total_recipients: number;
    created_at: string;
  }>) {
    const label =
      b.status === 'sent'
        ? `sent to ${b.total_recipients} contacts`
        : `${b.status} (${b.total_recipients} recipients)`;
    items.push({
      id: `broadcast-${b.id}`,
      kind: 'broadcast',
      text: `Broadcast "${b.name}" ${label}`,
      at: b.created_at,
      href: '/broadcasts',
    });
  }

  for (const l of (autoLogs.data ?? []) as unknown as Array<{
    id: string;
    trigger_event: string;
    status: string;
    created_at: string;
    automation: { name: string }[] | { name: string } | null;
    contact:
      | { name: string | null; phone: string }[]
      | { name: string | null; phone: string }
      | null;
  }>) {
    const automation = Array.isArray(l.automation)
      ? l.automation[0]
      : l.automation;
    const contact = Array.isArray(l.contact) ? l.contact[0] : l.contact;
    const who = contact?.name || contact?.phone || 'a contact';
    const autoName = automation?.name || 'Automation';
    items.push({
      id: `auto-${l.id}`,
      kind: 'automation',
      text: `Automation "${autoName}" ${l.status === 'failed' ? 'failed for' : 'triggered for'} ${who}`,
      at: l.created_at,
    });
  }

  return items
    .sort((a, b) => (a.at > b.at ? -1 : a.at < b.at ? 1 : 0))
    .slice(0, limit);
}

// --- Leads overview (dashboard) ----------------------------------------

export async function loadLeadsDashboard(db: DB): Promise<{
  stats: import('./types').LeadStatsLike;
  hotLeads: DashboardLeadRow[];
  overdueLeads: DashboardLeadRow[];
  todayFollowUps: DashboardLeadRow[];
}> {
  const { data, error } = await db
    .from('deals')
    .select(
      'id, title, value, currency, lead_temperature, lead_score, follow_up_at, contact:contacts(name, phone), stage:pipeline_stages(name, color)'
    )
    .eq('status', 'open')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  const now = new Date();
  const stats: import('./types').LeadStatsLike = {
    total: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    unqualified: 0,
    pipelineValue: 0,
    overdueFollowUps: 0,
  };

  const rows: DashboardLeadRow[] = [];

  for (const raw of data ?? []) {
    const row = raw as {
      id: string;
      title: string;
      value: number | null;
      currency: string | null;
      lead_temperature: string | null;
      lead_score: number | null;
      follow_up_at: string | null;
      contact:
        | { name: string | null; phone: string | null }
        | { name: string | null; phone: string | null }[]
        | null;
      stage:
        | { name: string; color: string }
        | { name: string; color: string }[]
        | null;
    };

    const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact;
    const stage = Array.isArray(row.stage) ? row.stage[0] : row.stage;

    stats.total++;
    stats.pipelineValue += Number(row.value) || 0;
    if (row.lead_temperature === 'hot') stats.hot++;
    else if (row.lead_temperature === 'warm') stats.warm++;
    else if (row.lead_temperature === 'cold') stats.cold++;
    else stats.unqualified++;
    if (isFollowUpOverdue(row.follow_up_at, now)) stats.overdueFollowUps++;

    rows.push({
      id: row.id,
      title: row.title,
      value: Number(row.value) || 0,
      currency: row.currency,
      lead_temperature: row.lead_temperature,
      lead_score: row.lead_score,
      follow_up_at: row.follow_up_at,
      contact_name: contact?.name ?? null,
      contact_phone: contact?.phone ?? null,
      stage_name: stage?.name ?? null,
      stage_color: stage?.color ?? null,
    });
  }

  const hotLeads = rows.filter((r) => r.lead_temperature === 'hot').slice(0, 4);

  const overdueLeads = rows
    .filter((r) => isFollowUpOverdue(r.follow_up_at, now))
    .slice(0, 8);

  const todayFollowUps = rows
    .filter((r) => isFollowUpDueToday(r.follow_up_at, now))
    .slice(0, 8);

  return { stats, hotLeads, overdueLeads, todayFollowUps };
}

// --- Sales CRM home board ---------------------------------------------

async function getPrimaryPipelineId(db: DB): Promise<string | null> {
  const { data, error } = await db
    .from('pipelines')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as { id: string } | undefined)?.id ?? null;
}

/**
 * Stages for the oldest (primary) pipeline only — avoids duplicate
 * stage names when the account has multiple pipelines.
 * Appends Won / Lost from deal status when those names are not already stages.
 */
export async function loadPipelineFunnel(db: DB): Promise<{
  stages: import('./types').PipelineStageSlice[];
}> {
  const pipelineId = await getPrimaryPipelineId(db);
  if (!pipelineId) return { stages: [] };

  const [stagesRes, openDealsRes, closedRes] = await Promise.all([
    db
      .from('pipeline_stages')
      .select('id, name, color, position')
      .eq('pipeline_id', pipelineId)
      .order('position'),
    db.from('deals').select('stage_id, value, status').eq('status', 'open'),
    db
      .from('deals')
      .select('status, value, stage_id')
      .in('status', ['won', 'lost']),
  ]);

  if (stagesRes.error) throw stagesRes.error;

  const stages = (stagesRes.data ?? []) as {
    id: string;
    name: string;
    color: string;
    position: number;
  }[];

  // Deduplicate by lowercased name within the primary pipeline (bad data safety).
  const seenNames = new Set<string>();
  const uniqueStages = stages.filter((s) => {
    const key = s.name.trim().toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });

  const stageIds = new Set(uniqueStages.map((s) => s.id));
  const openDeals = (openDealsRes.data ?? []) as {
    stage_id: string;
    value: number | null;
  }[];

  const byStage = new Map<string, { count: number; total: number }>();
  for (const d of openDeals) {
    if (!stageIds.has(d.stage_id)) continue;
    const row = byStage.get(d.stage_id) ?? { count: 0, total: 0 };
    row.count += 1;
    row.total += d.value ?? 0;
    byStage.set(d.stage_id, row);
  }

  const result: import('./types').PipelineStageSlice[] = uniqueStages.map(
    (s) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#64748b',
      dealCount: byStage.get(s.id)?.count ?? 0,
      totalValue: byStage.get(s.id)?.total ?? 0,
    })
  );

  let wonCount = 0;
  let wonValue = 0;
  let lostCount = 0;
  let lostValue = 0;
  for (const raw of closedRes.data ?? []) {
    const row = raw as {
      status: string;
      value: number | null;
      stage_id: string;
    };
    // Attribute closed deals whose last stage was on this pipeline.
    if (!stageIds.has(row.stage_id)) continue;
    if (row.status === 'won') {
      wonCount += 1;
      wonValue += row.value ?? 0;
    } else if (row.status === 'lost') {
      lostCount += 1;
      lostValue += row.value ?? 0;
    }
  }

  const hasWonStage = seenNames.has('won');
  const hasLostStage = seenNames.has('lost');
  if (!hasWonStage) {
    result.push({
      id: '__won__',
      name: 'Won',
      color: '#10b981',
      dealCount: wonCount,
      totalValue: wonValue,
    });
  }
  if (!hasLostStage) {
    result.push({
      id: '__lost__',
      name: 'Lost',
      color: '#ef4444',
      dealCount: lostCount,
      totalValue: lostValue,
    });
  }

  return { stages: result };
}

const SERVICE_PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#ec4899',
  '#10b981',
  '#6366f1',
  '#f97316',
];

/**
 * Open deals attributed to contact tags (first tag wins).
 * Used for Revenue-by-service and Lead-sources charts.
 */
export async function loadTagBreakdowns(db: DB): Promise<{
  revenueByService: import('./types').BreakdownDonutData;
  leadSources: import('./types').BreakdownDonutData;
}> {
  const { data: deals, error } = await db
    .from('deals')
    .select('id, value, contact_id')
    .eq('status', 'open');
  if (error) throw error;

  const openDeals = (deals ?? []) as {
    id: string;
    value: number | null;
    contact_id: string | null;
  }[];
  const contactIds = [
    ...new Set(openDeals.map((d) => d.contact_id).filter(Boolean) as string[]),
  ];

  const tagByContact = new Map<
    string,
    { id: string; name: string; color: string }
  >();

  if (contactIds.length > 0) {
    const { data: ctRows } = await db
      .from('contact_tags')
      .select('contact_id, tag:tags(id, name, color)')
      .in('contact_id', contactIds);

    for (const raw of ctRows ?? []) {
      const row = raw as {
        contact_id: string;
        tag:
          | { id: string; name: string; color: string }
          | { id: string; name: string; color: string }[]
          | null;
      };
      if (tagByContact.has(row.contact_id)) continue;
      const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag;
      if (!tag) continue;
      tagByContact.set(row.contact_id, {
        id: tag.id,
        name: tag.name,
        color: tag.color || '#64748b',
      });
    }
  }

  type Acc = { count: number; total: number; name: string; color: string };
  const byTag = new Map<string, Acc>();

  for (const d of openDeals) {
    const tag = d.contact_id ? tagByContact.get(d.contact_id) : undefined;
    const key = tag?.id ?? '__untagged__';
    const acc = byTag.get(key) ?? {
      count: 0,
      total: 0,
      name: tag?.name ?? 'Untagged',
      color: tag?.color ?? '#94a3b8',
    };
    acc.count += 1;
    acc.total += d.value ?? 0;
    byTag.set(key, acc);
  }

  const slices: import('./types').BreakdownSlice[] = [...byTag.entries()]
    .map(([id, acc], i) => ({
      id,
      name: acc.name,
      color: acc.color || SERVICE_PALETTE[i % SERVICE_PALETTE.length],
      count: acc.count,
      totalValue: acc.total,
    }))
    .sort((a, b) => b.totalValue - a.totalValue || b.count - a.count);

  const totalValue = slices.reduce((s, x) => s + x.totalValue, 0);
  const totalCount = slices.reduce((s, x) => s + x.count, 0);

  return {
    revenueByService: {
      slices: slices.filter((s) => s.totalValue > 0 || s.count > 0),
      totalValue,
      totalCount,
    },
    leadSources: {
      slices: [...slices].sort((a, b) => b.count - a.count),
      totalValue,
      totalCount,
    },
  };
}

export async function loadTeamPerformance(
  db: DB
): Promise<import('./types').TeamPerformanceRow[]> {
  const [dealsRes, profilesRes] = await Promise.all([
    db.from('deals').select('assigned_to, status, value'),
    db.from('profiles').select('id, user_id, full_name, email, role'),
  ]);

  if (dealsRes.error) throw dealsRes.error;

  const profiles = (profilesRes.data ?? []) as {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
  }[];
  // deals.assigned_to FK → profiles.id
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  type Acc = {
    openLeads: number;
    wonDeals: number;
    wonRevenue: number;
    lostDeals: number;
  };
  const byAssignee = new Map<string | null, Acc>();

  for (const raw of dealsRes.data ?? []) {
    const d = raw as {
      assigned_to: string | null;
      status: string;
      value: number | null;
    };
    const key = d.assigned_to;
    const acc = byAssignee.get(key) ?? {
      openLeads: 0,
      wonDeals: 0,
      wonRevenue: 0,
      lostDeals: 0,
    };
    if (d.status === 'open') acc.openLeads += 1;
    else if (d.status === 'won') {
      acc.wonDeals += 1;
      acc.wonRevenue += d.value ?? 0;
    } else if (d.status === 'lost') acc.lostDeals += 1;
    byAssignee.set(key, acc);
  }

  const rows: import('./types').TeamPerformanceRow[] = [];
  for (const [profileId, acc] of byAssignee) {
    const closed = acc.wonDeals + acc.lostDeals;
    const profile = profileId ? profileById.get(profileId) : null;
    const name =
      profile?.full_name?.trim() ||
      profile?.email ||
      (profileId ? 'Team member' : 'Unassigned');
    rows.push({
      userId: profile?.user_id ?? profileId,
      name,
      role: profile?.role?.trim() || (profileId ? 'Agent' : '—'),
      openLeads: acc.openLeads,
      wonDeals: acc.wonDeals,
      wonRevenue: acc.wonRevenue,
      conversionPct:
        closed > 0 ? Math.round((acc.wonDeals / closed) * 100) : null,
    });
  }

  return rows.sort(
    (a, b) => b.wonRevenue - a.wonRevenue || b.openLeads - a.openLeads
  );
}

function buildSalesInsights(input: {
  hotLeads: number;
  overdueFollowUps: number;
  todayFollowUps: number;
  openPipelineValue: number;
  openDealsCount: number;
  conversionRate: number | null;
}): import('./types').SalesInsight[] {
  const insights: import('./types').SalesInsight[] = [];

  if (input.overdueFollowUps > 0) {
    insights.push({
      id: 'overdue',
      severity: 'urgent',
      text: `${input.overdueFollowUps} follow-up${input.overdueFollowUps === 1 ? '' : 's'} overdue — clear them to keep deals moving.`,
      href: '/leads?filter=overdue',
    });
  }
  if (input.hotLeads > 0) {
    insights.push({
      id: 'hot',
      severity: 'warn',
      text: `${input.hotLeads} hot lead${input.hotLeads === 1 ? '' : 's'} need immediate follow-up.`,
      href: '/leads?filter=hot',
    });
  }
  if (input.todayFollowUps > 0) {
    insights.push({
      id: 'today',
      severity: 'info',
      text: `${input.todayFollowUps} follow-up${input.todayFollowUps === 1 ? '' : 's'} scheduled for today.`,
      href: '/leads',
    });
  }
  if (input.openDealsCount > 0 && input.openPipelineValue > 0) {
    insights.push({
      id: 'pipeline',
      severity: 'info',
      text: `${input.openDealsCount} open deal${input.openDealsCount === 1 ? '' : 's'} in pipeline — review stages in Pipelines.`,
      href: '/pipelines',
    });
  }
  if (input.conversionRate !== null && input.conversionRate < 25) {
    insights.push({
      id: 'conversion',
      severity: 'warn',
      text: `Win rate is ${input.conversionRate}% this period — check lost deals in Reports.`,
      href: '/reports',
    });
  }
  if (insights.length === 0) {
    insights.push({
      id: 'healthy',
      severity: 'info',
      text: 'Pipeline looks healthy — no urgent follow-ups right now.',
      href: '/leads',
    });
  }
  return insights.slice(0, 5);
}

/** Sales-first dashboard payload (month-to-date KPIs + funnel + team). */
export async function loadSalesCrmBundle(
  db: DB
): Promise<import('./types').SalesCrmBundle> {
  const range = resolveReportRange({ preset: 'this_month' });
  const [reports, funnelData, tagBreakdowns, leads, team] = await Promise.all([
    loadReportsBundle(db, range),
    loadPipelineFunnel(db),
    loadTagBreakdowns(db),
    loadLeadsDashboard(db),
    loadTeamPerformance(db),
  ]);

  const { summary } = reports;

  const kpis: import('./types').SalesKpiBundle = {
    rangeLabel: range.label,
    totalLeads: leads.stats.total,
    newLeadsInPeriod: summary.newLeads.current,
    openPipelineValue: summary.openPipelineValue,
    openDealsCount: summary.openDealsCount,
    wonRevenue: summary.revenueWon.current,
    wonDeals: summary.wonDeals.current,
    overdueFollowUps: leads.stats.overdueFollowUps,
    hotLeads: leads.stats.hot,
    conversionRate: summary.conversionRate,
  };

  const insights = buildSalesInsights({
    hotLeads: leads.stats.hot,
    overdueFollowUps: kpis.overdueFollowUps,
    todayFollowUps: leads.todayFollowUps.length,
    openPipelineValue: kpis.openPipelineValue,
    openDealsCount: kpis.openDealsCount,
    conversionRate: kpis.conversionRate,
  });

  return {
    kpis,
    funnelStages: funnelData.stages,
    revenueByService: tagBreakdowns.revenueByService,
    leadSources: tagBreakdowns.leadSources,
    hotLeads: leads.hotLeads,
    todayFollowUps: leads.todayFollowUps,
    overdueFollowUps: leads.overdueLeads,
    team,
    insights,
  };
}

function relativeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function computeHealthScore(input: {
  conversionRate: number | null;
  overdueFollowUps: number;
  hotLeads: number;
  openDealsCount: number;
  todayFollowUps: number;
}): import('./types').HealthScoreBundle {
  const conversionScore =
    input.conversionRate === null
      ? 55
      : Math.max(0, Math.min(100, Math.round(input.conversionRate * 2.2)));

  const overduePenalty = Math.min(40, input.overdueFollowUps * 8);
  const followupScore = Math.max(0, 100 - overduePenalty);

  const leadQuality =
    input.openDealsCount === 0
      ? 50
      : Math.max(
          20,
          Math.min(
            100,
            Math.round(
              40 + (input.hotLeads / Math.max(input.openDealsCount, 1)) * 60
            )
          )
        );

  const pipelineHealth =
    input.openDealsCount === 0
      ? 45
      : Math.max(
          35,
          Math.min(100, 55 + Math.min(30, input.openDealsCount * 2))
        );

  const score = Math.round(
    conversionScore * 0.3 +
      followupScore * 0.3 +
      leadQuality * 0.2 +
      pipelineHealth * 0.2
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: [
      { label: 'Pipeline', value: pipelineHealth },
      { label: 'Follow-ups', value: followupScore },
      { label: 'Conversion', value: conversionScore },
      { label: 'Lead quality', value: leadQuality },
    ],
  };
}

async function loadKanbanPreview(db: DB): Promise<{
  columns: import('./types').KanbanColumn[];
  totalValue: number;
  totalDeals: number;
}> {
  const funnel = await loadPipelineFunnel(db);
  const stageIds = funnel.stages.map((s) => s.id);
  if (stageIds.length === 0) {
    return { columns: [], totalValue: 0, totalDeals: 0 };
  }

  const { data: deals } = await db
    .from('deals')
    .select(
      'id, title, value, stage_id, lead_temperature, follow_up_at, updated_at, contact:contacts(name, company)'
    )
    .eq('status', 'open')
    .in('stage_id', stageIds)
    .order('updated_at', { ascending: false })
    .limit(80);

  type DealRow = {
    id: string;
    title: string;
    value: number | null;
    stage_id: string;
    lead_temperature: string | null;
    follow_up_at: string | null;
    updated_at: string;
    contact: { name: string | null; company: string | null } | null;
  };

  const rows = (deals ?? []) as unknown as DealRow[];
  const byStage = new Map<string, DealRow[]>();
  for (const d of rows) {
    const list = byStage.get(d.stage_id) ?? [];
    list.push(d);
    byStage.set(d.stage_id, list);
  }

  const columns: import('./types').KanbanColumn[] = funnel.stages.map(
    (stage) => {
      const list = byStage.get(stage.id) ?? [];
      return {
        id: stage.id,
        name: stage.name,
        color: stage.color,
        count: stage.dealCount,
        cards: list.slice(0, 4).map((d) => ({
          id: d.id,
          title: d.title,
          value: d.value ?? 0,
          contactName: d.contact?.name ?? null,
          company: d.contact?.company ?? null,
          priority: d.lead_temperature,
          lastActivityLabel: relativeAgo(d.updated_at),
          followUpAt: d.follow_up_at,
        })),
      };
    }
  );

  return {
    columns,
    totalValue: funnel.stages.reduce((s, st) => s + st.totalValue, 0),
    totalDeals: funnel.stages.reduce((s, st) => s + st.dealCount, 0),
  };
}

async function loadWhatsAppLive(
  db: DB
): Promise<import('./types').WhatsAppLiveBundle> {
  const todayStart = startOfLocalDay().toISOString();

  const [
    unreadConv,
    sent,
    delivered,
    read,
    replies,
    failed,
    activeAutos,
    broadcastQueue,
  ] = await Promise.all([
    db
      .from('conversations')
      .select('unread_count')
      .eq('status', 'open')
      .gt('unread_count', 0),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('sender_type', ['agent', 'bot'])
      .gte('created_at', todayStart),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('sender_type', ['agent', 'bot'])
      .eq('status', 'delivered')
      .gte('created_at', todayStart),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('sender_type', ['agent', 'bot'])
      .eq('status', 'read')
      .gte('created_at', todayStart),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_type', 'customer')
      .gte('created_at', todayStart),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', todayStart),
    db
      .from('automations')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    db
      .from('broadcasts')
      .select('id', { count: 'exact', head: true })
      .in('status', ['scheduled', 'sending']),
  ]);

  const unread = (unreadConv.data ?? []).reduce(
    (sum, row) => sum + (row.unread_count ?? 0),
    0
  );

  return {
    unread,
    sent: sent.count ?? 0,
    delivered: delivered.count ?? 0,
    read: read.count ?? 0,
    replies: replies.count ?? 0,
    failed: failed.count ?? 0,
    activeAutomations: activeAutos.count ?? 0,
    broadcastQueue: broadcastQueue.count ?? 0,
  };
}

/**
 * Enterprise dashboard composition — read-only aggregations only.
 * Does not touch WhatsApp send/webhook or automation engine.
 */
export async function loadEnterpriseDashboard(
  db: DB
): Promise<import('./types').EnterpriseDashboardBundle> {
  const range = resolveReportRange({ preset: 'this_month' });

  const [
    sales,
    salesActivity,
    metrics,
    series,
    activity,
    kanban,
    whatsapp,
    reports,
    taskStats,
    dueTasks,
  ] = await Promise.all([
    loadSalesCrmBundle(db),
    loadSalesActivity(db),
    loadMetrics(db),
    loadConversationsSeries(db, 7),
    loadActivity(db, 15),
    loadKanbanPreview(db),
    loadWhatsAppLive(db),
    loadReportsBundle(db, range),
    import('@/lib/tasks/queries')
      .then((m) => m.fetchTaskStats(db))
      .catch(() => null),
    db
      .from('tasks')
      .select('id, title, due_at, status, contact:contacts(name)')
      .in('status', ['todo', 'in_progress'])
      .gte('due_at', startOfLocalDay().toISOString())
      .lt(
        'due_at',
        (() => {
          const e = startOfLocalDay();
          e.setDate(e.getDate() + 1);
          return e.toISOString();
        })()
      )
      .order('due_at', { ascending: true })
      .limit(8),
  ]);

  const schedule: import('./types').ScheduleItem[] = [];

  for (const f of sales.todayFollowUps.slice(0, 6)) {
    schedule.push({
      id: `fu-${f.id}`,
      kind: 'followup',
      title: f.title || 'Follow-up',
      subtitle: f.contact_name ?? undefined,
      timeLabel: f.follow_up_at
        ? new Date(f.follow_up_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Today',
      at: f.follow_up_at ?? new Date().toISOString(),
    });
  }

  type TaskRow = {
    id: string;
    title: string;
    due_at: string | null;
    contact: { name: string | null } | null;
  };
  for (const t of (dueTasks.data ?? []) as unknown as TaskRow[]) {
    schedule.push({
      id: `task-${t.id}`,
      kind: 'task',
      title: t.title,
      subtitle: t.contact?.name ?? undefined,
      timeLabel: t.due_at
        ? new Date(t.due_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Today',
      at: t.due_at ?? new Date().toISOString(),
    });
  }

  schedule.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const sparklineOutgoing = series.map((p) => p.outgoing);
  const avgDealSize =
    sales.kpis.openDealsCount > 0
      ? sales.kpis.openPipelineValue / sales.kpis.openDealsCount
      : 0;

  const rev = reports.summary.revenueWon;
  const revenueDelta = {
    sign:
      rev.current === rev.previous ? 0 : rev.current > rev.previous ? 1 : -1,
    label: formatDeltaLabel(rev.current, rev.previous),
  };

  // Pipeline value has no prior snapshot — use new leads delta as soft signal.
  const nl = reports.summary.newLeads;
  const pipelineDelta = {
    sign: nl.current === nl.previous ? 0 : nl.current > nl.previous ? 1 : -1,
    label: formatDeltaLabel(nl.current, nl.previous),
  };

  const health = computeHealthScore({
    conversionRate: sales.kpis.conversionRate,
    overdueFollowUps: sales.kpis.overdueFollowUps,
    hotLeads: sales.kpis.hotLeads,
    openDealsCount: sales.kpis.openDealsCount,
    todayFollowUps: sales.todayFollowUps.length,
  });

  return {
    sales,
    salesActivity,
    metrics,
    whatsapp,
    series,
    activity,
    kanban,
    schedule: schedule.slice(0, 10),
    recentDeals: kanban.columns
      .flatMap((col) =>
        col.cards.map((c): import('./types').DashboardLeadRow => ({
          id: c.id,
          title: c.title,
          value: c.value,
          currency: null,
          lead_temperature: c.priority,
          lead_score: null,
          follow_up_at: null,
          contact_name: c.contactName,
          contact_phone: null,
          stage_name: col.name,
          stage_color: col.color,
        }))
      )
      .slice(0, 5),
    topNewLeads: reports.topDeals,
    recentClosed: reports.recentClosed,
    health,
    tasksDueToday: taskStats?.dueToday ?? 0,
    sparklineOutgoing,
    avgDealSize,
    revenueDelta,
    pipelineDelta,
  };
}

/** Re-export for dashboard delta labels from reports. */
export { formatDeltaLabel };
