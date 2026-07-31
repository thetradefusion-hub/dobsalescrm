"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Target,
  IndianRupee,
  Trophy,
  Bell,
  Flame,
  GitBranch,
} from 'lucide-react'

import { loadSalesCrmBundle } from '@/lib/dashboard/queries'
import type { SalesCrmBundle } from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { PipelineFunnel } from '@/components/dashboard/pipeline-funnel'
import { BreakdownDonut } from '@/components/dashboard/breakdown-donut'
import { FollowUpsPanel } from '@/components/dashboard/follow-ups-panel'
import { TeamPerformance } from '@/components/dashboard/team-performance'
import { AiInsights } from '@/components/dashboard/ai-insights'
import { formatDealCurrency } from '@/lib/currency'

export default function DashboardPage() {
  const [bundle, setBundle] = useState<SalesCrmBundle | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(() => {
    const db = createClient()
    setLoading(true)

    void loadSalesCrmBundle(db)
      .then((data) => setBundle(data))
      .catch((err) => console.error('[dashboard] sales bundle failed:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // Initial dashboard load — fetch once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadAll batches async setState after awaits
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- initial load only

  const kpis = bundle?.kpis
  const showSkeleton = loading || !bundle

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col space-y-4 overflow-x-hidden pb-2 pt-1 lg:space-y-5 lg:pb-0">
      <section className="w-full px-4 lg:px-0">
        <SectionHeading
          title="Sales overview"
          description="Leads, pipeline value, and wins for the current period"
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {showSkeleton || !kpis ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <MetricCard
                title="Total Leads"
                value={kpis.totalLeads.toLocaleString()}
                icon={Target}
                accent="blue"
                subtitle={`${kpis.newLeadsInPeriod} new in period`}
              />
              <MetricCard
                title="Active Pipeline"
                value={formatDealCurrency(kpis.openPipelineValue)}
                icon={GitBranch}
                accent="green"
                subtitle={`${kpis.openDealsCount} open deal${kpis.openDealsCount === 1 ? '' : 's'}`}
              />
              <MetricCard
                title="Won Revenue"
                value={formatDealCurrency(kpis.wonRevenue)}
                icon={IndianRupee}
                accent="amber"
                subtitle="Closed this period"
              />
              <MetricCard
                title="Won Deals"
                value={kpis.wonDeals.toLocaleString()}
                icon={Trophy}
                accent="teal"
                subtitle={
                  kpis.conversionRate === null
                    ? 'No closed deals yet'
                    : `${kpis.conversionRate}% win rate`
                }
              />
              <MetricCard
                title="Overdue Follow-ups"
                value={kpis.overdueFollowUps.toLocaleString()}
                icon={Bell}
                accent="red"
                subtitle={`${kpis.hotLeads} hot lead${kpis.hotLeads === 1 ? '' : 's'}`}
              />
            </>
          )}
        </div>
      </section>

      <QuickActions />

      <section className="w-full px-4 lg:px-0">
        <SectionHeading
          title="Pipeline"
          description="Stage funnel, revenue mix, and lead sources"
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-6">
            <PipelineFunnel
              stages={bundle?.funnelStages ?? []}
              loading={showSkeleton}
            />
          </div>
          <div className="min-w-0 xl:col-span-3">
            <BreakdownDonut
              title="Revenue Pipeline"
              description="By contact tags (services)"
              data={bundle?.revenueByService ?? null}
              loading={showSkeleton}
              mode="value"
              emptyHint="Tag contacts with services to break down pipeline value."
            />
          </div>
          <div className="min-w-0 xl:col-span-3">
            <BreakdownDonut
              title="Lead Sources"
              description="By contact tags"
              data={bundle?.leadSources ?? null}
              loading={showSkeleton}
              mode="count"
              emptyHint="Tag contacts (Website, Ads, Partner…) to track sources."
            />
          </div>
        </div>
      </section>

      <section className="w-full px-4 lg:px-0">
        <SectionHeading
          title="Team & follow-ups"
          description="Assignee performance, schedule, and pipeline signals"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <TeamPerformance rows={bundle?.team ?? []} loading={showSkeleton} />
          <FollowUpsPanel
            today={bundle?.todayFollowUps ?? []}
            overdue={bundle?.overdueFollowUps ?? []}
            loading={showSkeleton}
          />
          <AiInsights insights={bundle?.insights ?? []} loading={showSkeleton} />
        </div>
      </section>

      {/* Hot leads shortcut when present */}
      {!showSkeleton && kpis && kpis.hotLeads > 0 && (
        <div className="px-4 lg:px-0">
          <Link
            href="/leads?filter=hot"
            className="flex items-center gap-3 rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-wa-text transition-colors hover:border-red-500/40"
          >
            <Flame className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{kpis.hotLeads} hot lead{kpis.hotLeads === 1 ? '' : 's'}</span>
              {' '}ready for follow-up — open Leads to act.
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
