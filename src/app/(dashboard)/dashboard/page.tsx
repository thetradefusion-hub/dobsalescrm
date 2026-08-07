'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BadgeCheck,
  BarChart3,
  CalendarCheck2,
  Coins,
  Flame,
  GitBranch,
  IndianRupee,
  Kanban,
  LayoutList,
  Percent,
  PhoneCall,
  Sparkles,
  Table2,
  Target,
  TrendingUp,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { formatDealCurrency } from '@/lib/currency';
import { loadEnterpriseDashboard } from '@/lib/dashboard/queries';
import type { EnterpriseDashboardBundle } from '@/lib/dashboard/types';
import type { PipelineStage } from '@/types';

import { EnterpriseMetricCard } from '@/components/enterprise/metric-card';
import { SectionHeader } from '@/components/enterprise/section-header';
import { HealthScoreCard } from '@/components/enterprise/whatsapp-stats';
import { KanbanPreview } from '@/components/enterprise/kanban-preview';
import {
  AiWidget,
  Leaderboard,
  RecentDeals,
  ScheduleTimeline,
} from '@/components/enterprise/panels';
import { DashboardRightRail } from '@/components/enterprise/right-rail';
import { CommandPalette } from '@/components/enterprise/command-palette';
import {
  FollowUpsPanel,
  HotClientsPanel,
  LeadSourcesPanel,
  PerformancePanel,
} from '@/components/dashboard/sales-activity-panels';
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar';
import {
  TopDealsTable,
  RecentClosedTable,
} from '@/components/reports/deal-tables';
import { PipelineChevronBar } from '@/components/leads/pipeline-chevron';
import { DashboardPriorityBoard } from '@/components/dashboard/priority-board';
import { CreateLeadDialog } from '@/components/leads/create-lead-dialog';
import { ImportLeadsDialog } from '@/components/leads/import-leads-dialog';
import {
  DashboardHero,
  type HeroPulseStat,
} from '@/components/dashboard/dashboard-hero';
import { toast } from 'sonner';

function greetingForNow(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [bundle, setBundle] = useState<EnterpriseDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showQuickFilters, setShowQuickFilters] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeStageId, setActiveStageId] = useState('');
  const [pipelineId, setPipelineId] = useState('');

  const loadAll = useCallback(() => {
    const db = createClient();
    setLoading(true);
    void loadEnterpriseDashboard(db)
      .then((data) => {
        setBundle(data);
      })
      .catch((err) =>
        console.error('[dashboard] enterprise bundle failed:', err)
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadAll batches async setState after awaits
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial load only

  useEffect(() => {
    const db = createClient();
    void db
      .from('pipelines')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setPipelineId(data.id);
      });
  }, []);

  const showSkeleton = loading || !bundle;
  const kpis = bundle?.sales.kpis;
  const activity = bundle?.salesActivity;
  const firstName =
    profile?.full_name?.split(' ')[0] ??
    profile?.email?.split('@')[0] ??
    'there';

  const spark = bundle?.sparklineOutgoing ?? [];
  const replySpark = bundle?.series.map((p) => p.incoming) ?? [];
  const fallbackSpark = [2, 3, 2, 4, 5, 4, 6];

  const chevronStages: PipelineStage[] = useMemo(() => {
    const cols = bundle?.kanban.columns ?? [];
    return cols.map((c, i) => ({
      id: c.id,
      pipeline_id: pipelineId || 'dashboard',
      name: c.name,
      position: i,
      color: c.color || '#94a3b8',
      created_at: '',
    }));
  }, [bundle?.kanban.columns, pipelineId]);

  const stageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of bundle?.kanban.columns ?? []) {
      map[c.id] = c.count;
    }
    return map;
  }, [bundle?.kanban.columns]);

  const heroStats: HeroPulseStat[] = useMemo(() => {
    const overdue = kpis?.overdueFollowUps ?? 0;
    return [
      {
        label: 'Open pipeline',
        value: formatDealCurrency(kpis?.openPipelineValue ?? 0),
        icon: GitBranch,
        href: '/leads',
      },
      {
        label: 'Hot leads',
        value: String(kpis?.hotLeads ?? 0),
        icon: Flame,
        href: '/leads?filter=hot',
      },
      {
        label: 'Due today',
        value: String(bundle?.tasksDueToday ?? 0),
        icon: CalendarCheck2,
        href: '/tasks?filter=due_today',
      },
      {
        label: 'Overdue',
        value: String(overdue),
        icon: Activity,
        href: '/leads?filter=overdue',
        alert: overdue > 0,
      },
    ];
  }, [kpis, bundle?.tasksDueToday]);

  function submitSearch() {
    const q = search.trim();
    if (!q) {
      router.push('/leads');
      return;
    }
    router.push(`/leads?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="dark:bg-saas-bg flex min-h-0 w-full flex-1 overflow-hidden bg-[radial-gradient(1200px_600px_at_20%_-10%,#eef2ff_0%,transparent_55%),radial-gradient(900px_500px_at_100%_0%,#f5f3ff_0%,transparent_50%),linear-gradient(180deg,#f6f8fc_0%,#f2f5fa_100%)]">
      <CommandPalette />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 px-3 py-3 sm:gap-3.5 sm:px-4 lg:px-6 lg:py-5">
          <DashboardHero
            greeting={greetingForNow()}
            name={firstName}
            loading={showSkeleton}
            stats={heroStats}
            search={search}
            onSearchChange={setSearch}
            onSearchSubmit={submitSearch}
            filtersOpen={showQuickFilters}
            onToggleFilters={() => setShowQuickFilters((v) => !v)}
            onImport={() => setImportOpen(true)}
            onCreate={() => setCreateOpen(true)}
          />

          {showQuickFilters ? (
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { label: 'Hot', href: '/leads?filter=hot' },
                  { label: 'Overdue', href: '/leads?filter=overdue' },
                  { label: 'Open', href: '/leads' },
                  { label: 'Won', href: '/leads?filter=won' },
                ] as const
              ).map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="dark:bg-saas-card dark:ring-saas-border rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-violet-700 hover:ring-violet-200"
                >
                  {f.label}
                </Link>
              ))}
            </div>
          ) : null}

          {/* Chevron pipeline — tight */}
          <div className="dark:border-saas-border dark:bg-saas-card rounded-2xl border border-slate-200/70 bg-white/80 p-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            {showSkeleton ? (
              <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <PipelineChevronBar
                stages={chevronStages}
                counts={stageCounts}
                activeStageId={activeStageId || undefined}
                onSelect={(id) => {
                  setActiveStageId(id);
                  if (id) router.push('/leads');
                }}
              />
            )}
          </div>

          {/* KPI strip — 4 compact cards */}
          <section>
            <SectionHeader
              title="Today"
              description="Live priorities"
              icon={Activity}
              accent="pink"
            />
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {showSkeleton || !kpis || !bundle ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[108px] animate-pulse rounded-xl border border-slate-200/80 bg-white"
                  />
                ))
              ) : (
                <>
                  <EnterpriseMetricCard
                    compact
                    title="Hot Leads"
                    value={String(kpis.hotLeads)}
                    icon={Flame}
                    accent="pink"
                    subtitle="High score"
                    sparkline={spark.length > 1 ? spark : fallbackSpark}
                  />
                  <EnterpriseMetricCard
                    compact
                    title="Calls Pending"
                    value={String(bundle.tasksDueToday)}
                    icon={PhoneCall}
                    accent="green"
                    subtitle="Due today"
                    sparkline={spark.length > 1 ? spark : fallbackSpark}
                  />
                  <EnterpriseMetricCard
                    compact
                    title="Qualified Today"
                    value={String(activity?.performance.qualifiedToday ?? 0)}
                    icon={BadgeCheck}
                    accent="blue"
                    subtitle={`${activity?.performance.qualified ?? 0} this month`}
                    sparkline={
                      replySpark.length > 1 ? replySpark : fallbackSpark
                    }
                  />
                  <EnterpriseMetricCard
                    compact
                    title="Follow-ups"
                    value={String(bundle.sales.todayFollowUps.length)}
                    icon={CalendarCheck2}
                    accent="orange"
                    subtitle={`${kpis.overdueFollowUps} overdue`}
                    sparkline={spark.length > 1 ? spark : fallbackSpark}
                  />
                </>
              )}
            </div>
          </section>

          {/* Sales activity — follow-ups, hot clients, sources, performance */}
          <section>
            <SectionHeader
              title="Sales activity"
              description="Who to call today, who is hottest, and how the month is closing"
              icon={Target}
              accent="green"
              action={
                <Link
                  href="/leads"
                  className="text-[11px] font-semibold text-sky-700 hover:underline"
                >
                  All leads
                </Link>
              }
            />
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-12">
              <FollowUpsPanel
                today={activity?.todayFollowUps ?? []}
                upcoming={activity?.upcomingFollowUps ?? []}
                overdue={activity?.overdueFollowUps ?? []}
                loading={showSkeleton}
                className="xl:col-span-4"
              />
              <HotClientsPanel
                rows={activity?.hotClients ?? []}
                loading={showSkeleton}
                className="xl:col-span-3"
              />
              <PerformancePanel
                performance={activity?.performance ?? null}
                loading={showSkeleton}
                className="xl:col-span-3"
              />
              <LeadSourcesPanel
                slices={activity?.sources.slices ?? []}
                totalCount={activity?.sources.totalCount ?? 0}
                loading={showSkeleton}
                className="xl:col-span-2"
              />
            </div>
          </section>

          {/* Priorities */}
          <section>
            <SectionHeader
              title="Lead priorities"
              description="Hot · Follow-up · Overdue"
              icon={LayoutList}
              accent="orange"
              action={
                <Link
                  href="/leads"
                  className="text-[11px] font-semibold text-sky-700 hover:underline"
                >
                  Open Leads
                </Link>
              }
            />
            <DashboardPriorityBoard
              hotLeads={bundle?.sales.hotLeads ?? []}
              todayFollowUps={bundle?.sales.todayFollowUps ?? []}
              overdueFollowUps={bundle?.sales.overdueFollowUps ?? []}
              loading={showSkeleton}
            />
          </section>

          {/* Sales KPIs — compact 4-up */}
          <section>
            <SectionHeader
              title="Sales KPIs"
              description={kpis?.rangeLabel ?? 'This month'}
              icon={BarChart3}
              accent="violet"
              action={
                <Link
                  href="/reports"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline"
                >
                  <TrendingUp className="size-3" />
                  Reports
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              {showSkeleton || !kpis || !bundle ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[108px] animate-pulse rounded-xl border border-slate-200/80 bg-white"
                  />
                ))
              ) : (
                <>
                  <EnterpriseMetricCard
                    compact
                    title="Open Pipeline"
                    value={formatDealCurrency(kpis.openPipelineValue)}
                    icon={GitBranch}
                    accent="violet"
                    deltaLabel={bundle.pipelineDelta?.label}
                    deltaSign={bundle.pipelineDelta?.sign}
                    subtitle={`${kpis.openDealsCount} deals`}
                    sparkline={spark.length > 1 ? spark : fallbackSpark}
                  />
                  <EnterpriseMetricCard
                    compact
                    title="Revenue Closed"
                    value={formatDealCurrency(kpis.wonRevenue)}
                    icon={IndianRupee}
                    accent="green"
                    deltaLabel={bundle.revenueDelta?.label}
                    deltaSign={bundle.revenueDelta?.sign}
                    subtitle={`${kpis.wonDeals} won`}
                    sparkline={spark.length > 1 ? spark : fallbackSpark}
                  />
                  <EnterpriseMetricCard
                    compact
                    title="Conversion"
                    value={
                      kpis.conversionRate === null
                        ? '—'
                        : `${kpis.conversionRate}%`
                    }
                    icon={Percent}
                    accent="blue"
                    subtitle="Win rate"
                    sparkline={spark.length > 1 ? spark : fallbackSpark}
                  />
                  <EnterpriseMetricCard
                    compact
                    title="Avg Deal"
                    value={formatDealCurrency(bundle.avgDealSize)}
                    icon={Coins}
                    accent="orange"
                    subtitle="Open avg"
                    sparkline={spark.length > 1 ? spark : fallbackSpark}
                  />
                </>
              )}
            </div>
          </section>

          {/* Pipeline + Schedule */}
          <section>
            <SectionHeader
              title="Pipeline & schedule"
              description="Stage distribution and what is coming up"
              icon={Kanban}
              accent="green"
              action={
                <Link
                  href="/leads"
                  className="text-[11px] font-semibold text-sky-700 hover:underline"
                >
                  Open board
                </Link>
              }
            />
            <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-12">
              <div className="min-w-0 xl:col-span-8">
                <KanbanPreview
                  columns={bundle?.kanban.columns ?? []}
                  totalValue={bundle?.kanban.totalValue ?? 0}
                  totalDeals={bundle?.kanban.totalDeals ?? 0}
                  loading={showSkeleton}
                />
              </div>
              <div className="min-w-0 xl:col-span-4">
                <ScheduleTimeline
                  items={bundle?.schedule ?? []}
                  loading={showSkeleton}
                />
              </div>
            </div>
          </section>

          {/* Lead details — same as Reports */}
          <section>
            <SectionHeader
              title="Lead details"
              description="Highest-value new leads and recent closed outcomes"
              icon={Table2}
              accent="blue"
              action={
                <Link
                  href="/reports"
                  className="text-[11px] font-semibold text-sky-700 hover:underline"
                >
                  Full reports
                </Link>
              }
            />
            <div className="grid gap-2.5 lg:grid-cols-2">
              {showSkeleton ? (
                <>
                  <div className="h-64 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
                  <div className="h-64 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
                </>
              ) : (
                <>
                  <TopDealsTable rows={bundle?.topNewLeads ?? []} />
                  <RecentClosedTable rows={bundle?.recentClosed ?? []} />
                </>
              )}
            </div>
          </section>

          <QuickActionsBar onAddLead={() => setCreateOpen(true)} />

          {/* Bottom widgets — denser */}
          <section>
            <SectionHeader
              title="Insights & team"
              description="AI signals, open deals and team standings"
              icon={Sparkles}
              accent="pink"
            />
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              <AiWidget
                insights={bundle?.sales.insights ?? []}
                loading={showSkeleton}
              />
              <RecentDeals
                rows={bundle?.recentDeals ?? []}
                loading={showSkeleton}
              />
              <Leaderboard
                rows={bundle?.sales.team ?? []}
                loading={showSkeleton}
              />
            </div>
          </section>

          <div className="xl:hidden">
            <HealthScoreCard
              score={bundle?.health.score ?? 0}
              breakdown={bundle?.health.breakdown ?? []}
              loading={showSkeleton}
            />
          </div>
        </div>
      </div>

      <DashboardRightRail
        insights={bundle?.sales.insights ?? []}
        activity={bundle?.activity ?? []}
        overdueCount={kpis?.overdueFollowUps ?? 0}
        hotCount={kpis?.hotLeads ?? 0}
        loading={showSkeleton}
      />

      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          toast.success('Lead created');
          setCreateOpen(false);
          loadAll();
        }}
      />
      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        pipelineId={pipelineId || undefined}
        onImported={() => {
          setImportOpen(false);
          loadAll();
        }}
      />
    </div>
  );
}
