'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  IndianRupee,
  Loader2,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDealCurrency } from '@/lib/currency'
import { resolveReportRange, type ReportPresetId } from '@/lib/reports/date-range'
import { formatDeltaLabel, loadReportsBundle } from '@/lib/reports/queries'
import type { ReportsBundle } from '@/lib/reports/types'
import { MetricCard } from '@/components/dashboard/metric-card'
import { BreakdownDonut } from '@/components/dashboard/breakdown-donut'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import {
  DateRangePicker,
  defaultRangeInput,
} from '@/components/reports/date-range-picker'
import { DealsTrendChart } from '@/components/reports/deals-trend-chart'
import {
  StageBreakdown,
  TemperatureBreakdown,
} from '@/components/reports/breakdown-panels'
import { RecentClosedTable, TopDealsTable } from '@/components/reports/deal-tables'
import { Button } from '@/components/ui/button'
import type { BreakdownDonutData } from '@/lib/dashboard/types'

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
  const pipelineDonut: BreakdownDonutData | null = data
    ? {
        slices: data.pipelineSnapshot.stages.map((st) => ({
          id: st.id,
          name: st.name,
          color: st.color,
          count: st.dealCount,
          totalValue: st.totalValue,
        })),
        totalValue: data.pipelineSnapshot.totalValue,
        totalCount: data.pipelineSnapshot.stages.reduce(
          (n, st) => n + st.dealCount,
          0,
        ),
      }
    : null

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col space-y-5 overflow-x-hidden pb-6 pt-1">
      {/* Page toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-wa-border bg-wa-panel p-4 shadow-sm lg:rounded-xl lg:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-wa-green">
              Sales analytics
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-wa-text sm:text-2xl">
              Lead Reports
            </h1>
            <p className="mt-1 max-w-xl text-xs text-wa-muted sm:text-sm">
              Pipeline performance, win rate, and lead quality for the selected period.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || refreshing}
            onClick={() => void load(true)}
            className="shrink-0 border-wa-border"
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
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
          embedded
        />
      </div>

      {/* KPI strip */}
      <section>
        <SectionHeading
          title="Performance summary"
          description="Leads & revenue vs previous period"
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {loading || !s ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
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
                accent="amber"
                delta={{
                  sign: Math.sign(s.revenueWon.current - s.revenueWon.previous),
                  label: formatDeltaLabel(s.revenueWon.current, s.revenueWon.previous),
                }}
              />
              <MetricCard
                title="Win Rate"
                value={s.conversionRate != null ? `${s.conversionRate}%` : '—'}
                icon={TrendingUp}
                accent="teal"
                subtitle="Won ÷ closed deals in range"
              />
              <MetricCard
                title="Open Pipeline"
                value={formatDealCurrency(s.openPipelineValue)}
                icon={BarChart3}
                accent="green"
                subtitle={`${s.openDealsCount} open lead${s.openDealsCount === 1 ? '' : 's'}`}
              />
              <MetricCard
                title="Avg Lead Value"
                value={formatDealCurrency(Math.round(s.avgDealValue))}
                icon={IndianRupee}
                accent="blue"
                subtitle="New leads in this range"
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
            </>
          )}
        </div>
      </section>

      {/* Lead details — above charts */}
      <section>
        <SectionHeading
          title="Lead details"
          description="Highest-value new leads and recent closed outcomes"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <TopDealsTable rows={data?.topDeals ?? []} />
          <RecentClosedTable rows={data?.recentClosed ?? []} />
        </div>
      </section>

      {/* Breakdowns */}
      <section>
        <SectionHeading
          title="Pipeline & quality"
          description="Live open pipeline and lead temperature in range"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <BreakdownDonut
            title="Open Pipeline"
            description="Live value by stage"
            data={pipelineDonut}
            loading={loading}
            mode="value"
            emptyHint="Create open leads to see pipeline value by stage."
          />
          <TemperatureBreakdown
            data={data?.temperatureBreakdown ?? null}
            loading={loading}
          />
          <StageBreakdown
            data={data?.newLeadsByStage ?? null}
            loading={loading}
          />
        </div>
      </section>

      {/* Trend — moved below lead details */}
      <section>
        <SectionHeading
          title="Lead activity"
          description="Daily new leads, wins, and losses"
        />
        <DealsTrendChart data={data?.dealsTrend ?? null} loading={loading} />
      </section>

      <p className="text-center text-[11px] text-wa-muted/70">
        Win/loss uses deal close time. Open pipeline is a live snapshot, not limited to the date range.
      </p>
    </div>
  )
}
