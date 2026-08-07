'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Gauge,
  IndianRupee,
  LineChart,
  Table2,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDealCurrency, formatDealCurrencyShort } from '@/lib/currency'
import {
  defaultRangeInput,
  resolveReportRange,
  type ReportPresetId,
} from '@/lib/reports/date-range'
import { formatDeltaLabel, loadReportsBundle } from '@/lib/reports/queries'
import type { ReportsBundle } from '@/lib/reports/types'
import { MetricCard } from '@/components/dashboard/metric-card'
import { BreakdownDonut } from '@/components/dashboard/breakdown-donut'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { ReportsHero } from '@/components/reports/reports-hero'
import { ConversionFunnel } from '@/components/reports/conversion-funnel'
import { DealsTrendChart } from '@/components/reports/deals-trend-chart'
import {
  StageBreakdown,
  TemperatureBreakdown,
} from '@/components/reports/breakdown-panels'
import { RecentClosedTable, TopDealsTable } from '@/components/reports/deal-tables'
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

  const pipelineDonut: BreakdownDonutData | null = useMemo(
    () =>
      data
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
        : null,
    [data],
  )

  const highlights = useMemo(
    () => [
      { label: 'New leads', value: String(s?.newLeads.current ?? 0) },
      { label: 'Won deals', value: String(s?.wonDeals.current ?? 0) },
      {
        label: 'Revenue won',
        value: formatDealCurrencyShort(s?.revenueWon.current ?? 0),
      },
      {
        label: 'Win rate',
        value: s?.conversionRate != null ? `${s.conversionRate}%` : '—',
      },
    ],
    [s],
  )

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px] space-y-3 overflow-x-hidden pb-6 sm:space-y-4">
      <ReportsHero
        rangeLabel={data?.rangeLabel ?? range.label}
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        onPresetChange={setPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onRefresh={() => void load(true)}
        refreshing={refreshing}
        loading={loading}
        highlights={highlights}
      />

      {/* KPI strip */}
      <section>
        <SectionHeading
          title="Performance summary"
          description="Leads and revenue vs the previous period"
          icon={Gauge}
          accent="violet"
        />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
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
                  label: formatDeltaLabel(
                    s.revenueWon.current,
                    s.revenueWon.previous,
                  ),
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
                accent="violet"
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
                  label: formatDeltaLabel(
                    s.newContacts.current,
                    s.newContacts.previous,
                  ),
                }}
              />
            </>
          )}
        </div>
      </section>

      {/* Conversion, pipeline & quality */}
      <section>
        <SectionHeading
          title="Conversion & quality"
          description="How leads move, where value sits, and lead mix"
          icon={Activity}
          accent="blue"
        />
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          <ConversionFunnel summary={s} loading={loading} />
          <BreakdownDonut
            title="Open Pipeline"
            description="Live value by stage"
            data={pipelineDonut}
            loading={loading}
            mode="value"
            icon={BarChart3}
            iconAccent="bg-violet-50 text-violet-600"
            emptyHint="Create open leads to see pipeline value by stage."
          />
          <TemperatureBreakdown
            data={data?.temperatureBreakdown ?? null}
            loading={loading}
          />
          <StageBreakdown data={data?.newLeadsByStage ?? null} loading={loading} />
        </div>
      </section>

      {/* Trend */}
      <section>
        <SectionHeading
          title="Lead activity"
          description="Daily new leads, wins, and losses"
          icon={LineChart}
          accent="green"
        />
        <DealsTrendChart data={data?.dealsTrend ?? null} loading={loading} />
      </section>

      {/* Lead details */}
      <section>
        <SectionHeading
          title="Lead details"
          description="Highest-value new leads and recent closed outcomes"
          icon={Table2}
          accent="amber"
        />
        <div className="grid gap-2.5 xl:grid-cols-2">
          <TopDealsTable rows={data?.topDeals ?? []} />
          <RecentClosedTable rows={data?.recentClosed ?? []} />
        </div>
      </section>

      <p className="text-center text-[10px] text-slate-400">
        Win/loss uses deal close time. Open pipeline is a live snapshot, not limited
        to the date range.
      </p>
    </div>
  )
}
