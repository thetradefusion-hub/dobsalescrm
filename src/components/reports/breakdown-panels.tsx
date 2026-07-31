'use client'

import { Flame } from 'lucide-react'
import type { StageBarSlice, TemperatureSlice } from '@/lib/reports/types'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Skeleton } from '@/components/dashboard/skeleton'
import { formatDealCurrencyShort } from '@/lib/currency'

interface BreakdownPanelProps {
  title: string
  subtitle: string
  loading: boolean
  empty: boolean
  emptyTitle: string
  emptyHint: string
  children: React.ReactNode
}

function BreakdownPanel({
  title,
  subtitle,
  loading,
  empty,
  emptyTitle,
  emptyHint,
  children,
}: BreakdownPanelProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-sm font-semibold text-wa-text">{title}</h2>
        <p className="mt-0.5 text-xs text-wa-muted/80">{subtitle}</p>
      </header>
      <div className="flex-1 p-4 sm:p-5">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : empty ? (
          <EmptyState icon={Flame} title={emptyTitle} hint={emptyHint} />
        ) : (
          children
        )}
      </div>
    </section>
  )
}

export function TemperatureBreakdown({
  data,
  loading,
}: {
  data: TemperatureSlice[] | null
  loading: boolean
}) {
  const total = (data ?? []).reduce((s, x) => s + x.count, 0)
  const empty = total === 0

  return (
    <BreakdownPanel
      title="Lead Temperature"
      subtitle="Hot / warm / cold mix for new leads in range"
      loading={loading}
      empty={empty}
      emptyTitle="No new leads in this range"
      emptyHint="Lead temperature breakdown appears when leads are created."
    >
      <ul className="space-y-3">
        {(data ?? []).map((slice) => {
          const pct = total > 0 ? Math.round((slice.count / total) * 100) : 0
          return (
            <li key={slice.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-wa-text">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: slice.color }}
                  />
                  {slice.label}
                </span>
                <span className="tabular-nums text-wa-muted">
                  {slice.count} ({pct}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-wa-surface">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: slice.color }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </BreakdownPanel>
  )
}

export function StageBreakdown({
  data,
  loading,
}: {
  data: StageBarSlice[] | null
  loading: boolean
}) {
  const total = (data ?? []).reduce((s, x) => s + x.count, 0)
  const empty = total === 0

  return (
    <BreakdownPanel
      title="New Leads by Stage"
      subtitle="Where new leads entered the pipeline"
      loading={loading}
      empty={empty}
      emptyTitle="No stage data"
      emptyHint="New leads will show their starting stage here."
    >
      <ul className="space-y-2.5">
        {(data ?? []).map((slice) => (
          <li
            key={slice.id}
            className="flex items-center gap-3 rounded-lg border border-wa-border/60 bg-wa-surface/30 px-3 py-2 text-xs"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate font-medium text-wa-text">
              {slice.name}
            </span>
            <span className="tabular-nums text-wa-muted">{slice.count}</span>
            <span className="w-16 text-right tabular-nums text-wa-text/90">
              {formatDealCurrencyShort(slice.value)}
            </span>
          </li>
        ))}
      </ul>
    </BreakdownPanel>
  )
}
