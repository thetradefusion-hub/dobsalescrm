// Shared result shapes the dashboard components consume. Centralised
// here so each component stays thin and the page-level loader wires
// them up without type gymnastics.

export interface MetricDelta {
  current: number;
  previous: number;
}

export interface MetricsBundle {
  activeConversations: MetricDelta;
  newContactsToday: MetricDelta;
  openDealsValue: number;
  openDealsCount: number;
  messagesSentToday: MetricDelta;
  /** Open leads (same as open deals) with temperature breakdown. */
  leadsTotal: number;
  leadsHot: number;
  leadsOverdue: number;
}

export interface ConversationsSeriesPoint {
  day: string; // YYYY-MM-DD local
  incoming: number;
  outgoing: number;
}

export interface PipelineStageSlice {
  id: string;
  name: string;
  color: string;
  dealCount: number;
  totalValue: number;
}

export interface PipelineDonutData {
  stages: PipelineStageSlice[];
  totalValue: number;
}

export interface ResponseTimeBucket {
  /** 0 = Mon … 6 = Sun (Monday-first). */
  dow: number;
  /** Average first-response time in minutes. Null means no samples. */
  avgMinutes: number | null;
  samples: number;
}

export interface ResponseTimeSummary {
  buckets: ResponseTimeBucket[];
  thisWeekAvg: number | null;
  lastWeekAvg: number | null;
}

export type ActivityKind =
  | 'message'
  | 'deal'
  | 'broadcast'
  | 'automation'
  | 'contact';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** Primary line of text rendered in the feed. Pre-formatted. */
  text: string;
  /** ISO timestamp the item happened at, drives relative-time + sort. */
  at: string;
  /** Optional deep-link for the whole row (not all items have a target). */
  href?: string;
}

export interface DashboardLeadRow {
  id: string;
  title: string;
  value: number;
  currency?: string | null;
  lead_temperature: string | null;
  lead_score: number | null;
  follow_up_at: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  stage_name: string | null;
  stage_color: string | null;
}

export interface LeadsDashboardBundle {
  stats: LeadStatsLike;
  hotLeads: DashboardLeadRow[];
  overdueLeads: DashboardLeadRow[];
  todayFollowUps: DashboardLeadRow[];
}

/** Period sales KPIs for the CRM home board. */
export interface SalesKpiBundle {
  rangeLabel: string;
  totalLeads: number;
  newLeadsInPeriod: number;
  openPipelineValue: number;
  openDealsCount: number;
  wonRevenue: number;
  wonDeals: number;
  overdueFollowUps: number;
  hotLeads: number;
  conversionRate: number | null;
}

export interface TeamPerformanceRow {
  userId: string | null;
  name: string;
  role: string;
  openLeads: number;
  wonDeals: number;
  wonRevenue: number;
  conversionPct: number | null;
}

export interface SalesInsight {
  id: string;
  severity: 'info' | 'warn' | 'urgent';
  text: string;
  href?: string;
}

export interface SalesCrmBundle {
  kpis: SalesKpiBundle;
  /** Primary pipeline stages only (fixes multi-pipeline duplicates). */
  funnelStages: PipelineStageSlice[];
  /** Open-deal value by contact tag (service proxy). */
  revenueByService: BreakdownDonutData;
  /** Open-lead count by contact tag (source proxy). */
  leadSources: BreakdownDonutData;
  hotLeads: DashboardLeadRow[];
  todayFollowUps: DashboardLeadRow[];
  overdueFollowUps: DashboardLeadRow[];
  team: TeamPerformanceRow[];
  insights: SalesInsight[];
}

export interface BreakdownSlice {
  id: string;
  name: string;
  color: string;
  count: number;
  totalValue: number;
}

export interface BreakdownDonutData {
  slices: BreakdownSlice[];
  totalValue: number;
  totalCount: number;
}

/** Mirror of lib/leads LeadStats — kept local to avoid circular imports. */
export interface LeadStatsLike {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  unqualified: number;
  pipelineValue: number;
  overdueFollowUps: number;
}

/** Compact deal card for dashboard kanban preview. */
export interface KanbanDealCard {
  id: string;
  title: string;
  value: number;
  contactName: string | null;
  company: string | null;
  priority: string | null;
  lastActivityLabel: string | null;
  /** Next scheduled follow-up, drives the card footer. */
  followUpAt: string | null;
}

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  count: number;
  cards: KanbanDealCard[];
}

export interface ScheduleItem {
  id: string;
  kind: 'followup' | 'task' | 'call' | 'meeting';
  title: string;
  subtitle?: string;
  timeLabel: string;
  at: string;
}

export interface WhatsAppLiveBundle {
  unread: number;
  sent: number;
  delivered: number;
  read: number;
  replies: number;
  failed: number;
  activeAutomations: number;
  broadcastQueue: number;
}

export interface HealthScoreBundle {
  score: number;
  breakdown: { label: string; value: number }[];
}

/** Full enterprise dashboard view-model (read-only composition). */
export interface EnterpriseDashboardBundle {
  sales: SalesCrmBundle;
  /** Follow-ups, hot clients, real lead sources and month outcomes. */
  salesActivity: import('./sales-activity').SalesActivityBundle;
  metrics: MetricsBundle;
  whatsapp: WhatsAppLiveBundle;
  series: ConversationsSeriesPoint[];
  activity: ActivityItem[];
  kanban: {
    columns: KanbanColumn[];
    totalValue: number;
    totalDeals: number;
  };
  schedule: ScheduleItem[];
  recentDeals: DashboardLeadRow[];
  /** Highest-value leads created this month (from reports bundle). */
  topNewLeads: import('@/lib/reports/types').ReportDealRow[];
  /** Won/lost in this month. */
  recentClosed: import('@/lib/reports/types').ReportDealRow[];
  health: HealthScoreBundle;
  tasksDueToday: number;
  sparklineOutgoing: number[];
  avgDealSize: number;
  revenueDelta: { sign: number; label: string } | null;
  pipelineDelta: { sign: number; label: string } | null;
}
