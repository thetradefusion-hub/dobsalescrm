"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare,
  UserPlus,
  IndianRupee,
  Send,
  Inbox,
  Flame,
} from 'lucide-react'

import {
  loadActivity,
  loadConversationsSeries,
  loadLeadsDashboard,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  DashboardLeadRow,
  LeadStatsLike,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { LeadsOverview } from '@/components/dashboard/leads-overview'
import { formatDealCurrency } from '@/lib/currency'
import { useIsDesktopLayout } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [range, setRange] = useState<RangeDays>(30)
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  const [leadStats, setLeadStats] = useState<LeadStatsLike | null>(null)
  const [hotLeads, setHotLeads] = useState<DashboardLeadRow[]>([])
  const [overdueLeads, setOverdueLeads] = useState<DashboardLeadRow[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)

  const [refreshing, setRefreshing] = useState(false)
  const isDesktop = useIsDesktopLayout()

  const loadAll = useCallback((isRefresh = false) => {
    const db = createClient()
    if (isRefresh) setRefreshing(true)
    else {
      setMetricsLoading(true)
      setSeriesLoading(true)
      setPipelineLoading(true)
      setResponseTimeLoading(true)
      setActivityLoading(true)
      setLeadsLoading(true)
    }

    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false))

    void loadConversationsSeries(db, range)
      .then((s) => setSeries((prev) => ({ ...prev, [range]: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false))

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error('[dashboard] pipeline failed:', err))
      .finally(() => setPipelineLoading(false))

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false))

    void loadLeadsDashboard(db)
      .then((l) => {
        setLeadStats(l.stats)
        setHotLeads(l.hotLeads)
        setOverdueLeads(l.overdueLeads)
      })
      .catch((err) => console.error('[dashboard] leads failed:', err))
      .finally(() => setLeadsLoading(false))

    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => {
        setActivityLoading(false)
        if (isRefresh) setRefreshing(false)
      })
  }, [range])

  useEffect(() => {
    // Initial dashboard load — fetch once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadAll batches async setState after awaits
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- initial load only

  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      const db = createClient()
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  const handleRefresh = useCallback(() => {
    setSeries((prev) => ({ ...prev, [range]: null }))
    loadAll(true)
  }, [loadAll, range])

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col space-y-4 overflow-x-hidden pb-2 lg:space-y-5 lg:pb-0">
      <div className={cn(!isDesktop && 'wa-mobile-shell', 'lg:bg-transparent')}>
        <DashboardHeader onRefresh={handleRefresh} isRefreshing={refreshing} />

        {!isDesktop && (
          <div className="wa-fade-in px-4 pb-1 pt-3">
            <Link
              href="/inbox"
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-wa-green/30 bg-gradient-to-r from-wa-green to-wa-teal p-4 shadow-lg shadow-wa-green/25 active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Inbox className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Open Inbox</p>
                <p className="text-xs text-white/80">Reply to WhatsApp chats</p>
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                Go
              </span>
            </Link>
          </div>
        )}
      </div>

      <section className="w-full px-4 lg:px-0">
        <SectionHeading
          title="Overview"
          description="Key metrics across inbox, contacts, and leads"
        />
        {/* Full-width grid — no horizontal side-scroll */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {metricsLoading || !metrics ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : (
            <>
              <MetricCard
                title="Active Conversations"
                value={metrics.activeConversations.current.toLocaleString()}
                icon={MessageSquare}
                accent="green"
                delta={{
                  sign: metrics.activeConversations.previous,
                  label: deltaLabel(metrics.activeConversations.previous, 'new today vs yesterday'),
                }}
              />
              <MetricCard
                title="New Contacts Today"
                value={metrics.newContactsToday.current.toLocaleString()}
                icon={UserPlus}
                accent="blue"
                delta={{
                  sign:
                    metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  label: deltaLabel(
                    metrics.newContactsToday.current - metrics.newContactsToday.previous,
                    'vs yesterday',
                  ),
                }}
              />
              <MetricCard
                title="Hot Leads"
                value={metrics.leadsHot.toLocaleString()}
                icon={Flame}
                accent="red"
                subtitle={`${metrics.leadsTotal} open · ${metrics.leadsOverdue} overdue`}
              />
              <MetricCard
                title="Open Deals Value"
                value={formatDealCurrency(metrics.openDealsValue)}
                icon={IndianRupee}
                accent="amber"
                subtitle={`${metrics.openDealsCount} open deal${metrics.openDealsCount === 1 ? '' : 's'}`}
              />
              <MetricCard
                title="Messages Sent Today"
                value={metrics.messagesSentToday.current.toLocaleString()}
                icon={Send}
                accent="teal"
                delta={{
                  sign:
                    metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  label: deltaLabel(
                    metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                    'vs yesterday',
                  ),
                }}
              />
            </>
          )}
        </div>
      </section>

      <div className="w-full px-4 lg:px-0">
        <LeadsOverview
          stats={leadStats}
          hotLeads={hotLeads}
          overdueLeads={overdueLeads}
          loading={leadsLoading}
        />
      </div>

      <QuickActions />

      <section className="w-full">
        <div className="px-4 lg:px-0">
          <SectionHeading
            title="Analytics"
            description="Conversation trends, pipeline value, and response performance"
          />
        </div>
        <div className="space-y-4 px-4 lg:px-0">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <div className="h-full min-w-0 xl:col-span-3">
              <ConversationsChart
                series={series}
                loading={seriesLoading}
                range={range}
                onRangeChange={handleRangeChange}
              />
            </div>
            <div className="h-full min-w-0 xl:col-span-2">
              <PipelineDonut data={pipeline} loading={pipelineLoading} />
            </div>
          </div>
          <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />
        </div>
      </section>

      <section className="w-full px-4 lg:px-0">
        <ActivityFeed items={activity} loading={activityLoading} />
      </section>
    </div>
  )
}

function deltaLabel(delta: number, suffix: string): string {
  if (delta === 0) return `No change ${suffix}`
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
