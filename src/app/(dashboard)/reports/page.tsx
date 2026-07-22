'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  IndianRupee,
  MessageSquare,
  Radio,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDealCurrency } from '@/lib/currency'
import { resolveReportRange, type ReportPresetId } from '@/lib/reports/date-range'
import { formatDeltaLabel, loadReportsBundle } from '@/lib/reports/queries'
import type { ReportsBundle } from '@/lib/reports/types'
import { MetricCard } from '@/components/dashboard/metric-card'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import {
  DateRangePicker,
  defaultRangeInput,
} from '@/components/reports/date-range-picker'
import { DealsTrendChart } from '@/components/reports/deals-trend-chart'
import { MessagesTrendChart } from '@/components/reports/messages-trend-chart'
import {
  StageBreakdown,
  TemperatureBreakdown,
} from '@/components/reports/breakdown-panels'
import { RecentClosedTable, TopDealsTable } from '@/components/reports/deal-tables'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function ReportsPage() {
  const initial = defaultRangeInput()
  const [preset, setPreset] = useState<ReportPresetId>(initial.preset)
  const [customFrom, setCustomFrom] = useState(initial.customFrom ?? '')
  const [customTo, setCustomTo] = useState(initial.customTo ?? '')
  const [data, setData] = useState<ReportsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const range = useMemo(
    () => resolveReportRange({ preset, customFrom, customTo }),
    [preset, customFrom, customTo],
  )

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        const db = createClient()
        const bundle = await loadReportsBundle(db, range)
        setData(bundle)
      } catch (err) {
        console.error('[reports] load failed:', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [range],
  )

  useEffect(() => {
    void load()
  }, [load])

  const s = data?.summary

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col space-y-5 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-wa-text sm:text-2xl">
            <BarChart3 className="h-6 w-6 text-wa-green" />
            Reports
          </h1>
          <p className="mt-0.5 text-xs text-wa-muted sm:text-sm">
            Complete analytics for leads, deals, messages & broadcasts
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || refreshing}
          onClick={() => void load(true)}
          className="border-wa-border"
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Refresh
        </Button>
      </div>

      <DateRangePicker
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        onPresetChange={setPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        rangeLabel={data?.rangeLabel ?? range.label}
      />

      <SectionHeading
        title="Overview"
        description="Key metrics for the selected period vs previous period"
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
        {loading || !s ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title="New Leads"
              value={String(s.newLeads.current)}
              icon={Target}
              accent="blue"
              delta={{
                sign: Math.sign(s.newLeads.current - s.newLeads.previous),
                label: formatDeltaLabel(s.newLeads.current, s.newLeads.previous),
              }}
            />
            <MetricCard
              title="Won Deals"
              value={String(s.wonDeals.current)}
              icon={Trophy}
              accent="green"
              delta={{
                sign: Math.sign(s.wonDeals.current - s.wonDeals.previous),
                label: formatDeltaLabel(s.wonDeals.current, s.wonDeals.previous),
              }}
            />
            <MetricCard
              title="Lost Deals"
              value={String(s.lostDeals.current)}
              icon={TrendingDown}
              accent="red"
              delta={{
                sign: Math.sign(s.lostDeals.current - s.lostDeals.previous),
                label: formatDeltaLabel(s.lostDeals.current, s.lostDeals.previous),
              }}
            />
            <MetricCard
              title="Revenue Won"
              value={formatDealCurrency(s.revenueWon.current)}
              icon={IndianRupee}
              accent="green"
              delta={{
                sign: Math.sign(s.revenueWon.current - s.revenueWon.previous),
                label: formatDeltaLabel(s.revenueWon.current, s.revenueWon.previous),
              }}
            />
            <MetricCard
              title="Conversion Rate"
              value={s.conversionRate != null ? `${s.conversionRate}%` : '—'}
              icon={TrendingUp}
              accent="teal"
              subtitle="Won ÷ (Won + Lost) in range"
            />
            <MetricCard
              title="Open Pipeline"
              value={formatDealCurrency(s.openPipelineValue)}
              icon={BarChart3}
              accent="amber"
              subtitle={`${s.openDealsCount} open deal${s.openDealsCount === 1 ? '' : 's'} now`}
            />
            <MetricCard
              title="Avg Deal Value"
              value={formatDealCurrency(Math.round(s.avgDealValue))}
              icon={IndianRupee}
              accent="blue"
              subtitle="New leads in range"
            />
            <MetricCard
              title="New Contacts"
              value={String(s.newContacts.current)}
              icon={UserPlus}
              accent="teal"
              delta={{
                sign: Math.sign(s.newContacts.current - s.newContacts.previous),
                label: formatDeltaLabel(s.newContacts.current, s.newContacts.previous),
              }}
            />
            <MetricCard
              title="Messages Sent"
              value={String(s.messagesSent.current)}
              icon={MessageSquare}
              accent="green"
              delta={{
                sign: Math.sign(s.messagesSent.current - s.messagesSent.previous),
                label: formatDeltaLabel(s.messagesSent.current, s.messagesSent.previous),
              }}
            />
            <MetricCard
              title="Messages Received"
              value={String(s.messagesReceived.current)}
              icon={Users}
              accent="blue"
              delta={{
                sign: Math.sign(s.messagesReceived.current - s.messagesReceived.previous),
                label: formatDeltaLabel(
                  s.messagesReceived.current,
                  s.messagesReceived.previous,
                ),
              }}
            />
            <MetricCard
              title="Broadcasts Sent"
              value={String(s.broadcastsSent.current)}
              icon={Radio}
              accent="amber"
              delta={{
                sign: Math.sign(s.broadcastsSent.current - s.broadcastsSent.previous),
                label: formatDeltaLabel(s.broadcastsSent.current, s.broadcastsSent.previous),
              }}
            />
          </>
        )}
      </div>

      <SectionHeading title="Trends" description="Daily activity over the selected range" />
      <div className="grid gap-4 lg:grid-cols-2">
        <DealsTrendChart data={data?.dealsTrend ?? null} loading={loading} />
        <MessagesTrendChart data={data?.messagesTrend ?? null} loading={loading} />
      </div>

      <SectionHeading title="Breakdown" description="Pipeline snapshot & lead quality" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PipelineDonut data={data?.pipelineSnapshot ?? null} loading={loading} />
        </div>
        <TemperatureBreakdown
          data={data?.temperatureBreakdown ?? null}
          loading={loading}
        />
        <StageBreakdown data={data?.newLeadsByStage ?? null} loading={loading} />
      </div>

      <SectionHeading title="Deal tables" description="Top performers & recent outcomes" />
      <div className="grid gap-4 lg:grid-cols-2">
        <TopDealsTable rows={data?.topDeals ?? []} />
        <RecentClosedTable rows={data?.recentClosed ?? []} />
      </div>

      <p className="text-center text-[11px] text-wa-muted/70">
        Won/lost dates use deal update time when status changed. Open pipeline is a live snapshot.
      </p>
    </div>
  )
}
