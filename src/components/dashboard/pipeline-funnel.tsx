'use client'

import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { formatDealCurrencyShort } from '@/lib/currency'
import type { PipelineStageSlice } from '@/lib/dashboard/types'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

interface PipelineFunnelProps {
  stages: PipelineStageSlice[]
  loading?: boolean
}

/**
 * Reference layout: tapered funnel (left) + stage table (right) in one card.
 * Stage names appear in both — that is intentional; data must not duplicate.
 */
export function PipelineFunnel({ stages, loading }: PipelineFunnelProps) {
  const totalDeals = stages.reduce((s, x) => s + x.dealCount, 0)
  const maxCount = Math.max(1, ...stages.map((s) => s.dealCount))

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="flex items-start justify-between gap-3 border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <h2 className="text-sm font-semibold text-wa-text">Sales Pipeline Overview</h2>
          <p className="mt-0.5 text-xs text-wa-muted/80">
            Primary pipeline · {totalDeals} deals
          </p>
        </div>
        <Link
          href="/pipelines"
          className="shrink-0 text-xs font-medium text-wa-teal hover:underline"
        >
          View board
        </Link>
      </header>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : stages.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No pipeline stages yet"
            hint="Set up stages in Pipelines to see the funnel."
          />
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            {/* Tapered horizontal funnel */}
            <div className="flex flex-col justify-center gap-1.5 py-1">
              {stages.map((stage, i) => {
                const widthPct =
                  stages.length <= 1
                    ? 100
                    : 100 - (i / (stages.length - 1)) * 42
                const barH = Math.max(
                  22,
                  Math.round(18 + (stage.dealCount / maxCount) * 14),
                )
                return (
                  <div
                    key={stage.id}
                    className="flex items-center gap-2"
                    title={`${stage.name}: ${stage.dealCount}`}
                  >
                    <div
                      className="relative flex items-center justify-between overflow-hidden rounded-md px-2.5 transition-all"
                      style={{
                        width: `${widthPct}%`,
                        minHeight: barH,
                        background: stage.color,
                      }}
                    >
                      <span className="truncate text-[11px] font-semibold text-white drop-shadow-sm">
                        {stage.name}
                      </span>
                      <span className="ml-2 shrink-0 text-[11px] font-bold tabular-nums text-white drop-shadow-sm">
                        {stage.dealCount}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Stage table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[240px] text-left text-xs">
                <thead>
                  <tr className="border-b border-wa-border text-wa-muted">
                    <th className="pb-2 pr-2 font-medium">Stage</th>
                    <th className="pb-2 pr-2 font-medium tabular-nums">Count</th>
                    <th className="pb-2 pr-2 font-medium tabular-nums">Value</th>
                    <th className="pb-2 font-medium tabular-nums">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((stage) => {
                    const conv =
                      totalDeals > 0
                        ? Math.round((stage.dealCount / totalDeals) * 100)
                        : 0
                    return (
                      <tr
                        key={stage.id}
                        className="border-b border-wa-border/60 last:border-0"
                      >
                        <td className="py-2 pr-2">
                          <span className="inline-flex max-w-[9rem] items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: stage.color }}
                              aria-hidden
                            />
                            <span className="truncate text-wa-text">{stage.name}</span>
                          </span>
                        </td>
                        <td className="py-2 pr-2 tabular-nums text-wa-text">
                          {stage.dealCount}
                        </td>
                        <td className="py-2 pr-2 tabular-nums text-wa-text">
                          {formatDealCurrencyShort(stage.totalValue)}
                        </td>
                        <td className="py-2 tabular-nums text-wa-muted">{conv}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
