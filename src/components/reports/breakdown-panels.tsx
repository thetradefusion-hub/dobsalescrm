'use client'

import { Flame, Layers } from 'lucide-react'
import type { StageBarSlice, TemperatureSlice } from '@/lib/reports/types'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Skeleton } from '@/components/dashboard/skeleton'
import { formatDealCurrencyShort } from '@/lib/currency'
import { cn } from '@/lib/utils'

interface BreakdownPanelProps {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  loading: boolean
  empty: boolean
  emptyTitle: string
  emptyHint: string
  children: React.ReactNode
}

function BreakdownPanel({
  title,
  subtitle,
  icon: Icon,
  accent,
  loading,
  empty,
  emptyTitle,
  emptyHint,
  children,
}: BreakdownPanelProps) {
  return (
    <section className="premium-panel flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-3 dark:border-saas-border">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-current/15',
            accent,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-slate-800 dark:text-saas-text">
            {title}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </header>
      <div className="flex-1 p-3.5 sm:p-4">
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
      subtitle="Hot / warm / cold mix for new leads"
      icon={Flame}
      accent="bg-rose-50 text-rose-600"
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
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-saas-text">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: slice.color }}
                  />
                  {slice.label}
                </span>
                <span className="tabular-nums text-slate-400">
                  {slice.count}{' '}
                  <span className="font-bold text-slate-700 dark:text-saas-text">
                    {pct}%
                  </span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-saas-bg">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
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
      icon={Layers}
      accent="bg-sky-50 text-sky-600"
      loading={loading}
      empty={empty}
      emptyTitle="No stage data"
      emptyHint="New leads will show their starting stage here."
    >
      <ul className="space-y-1.5">
        {(data ?? []).map((slice) => (
          <li
            key={slice.id}
            className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2 text-[11px] transition hover:border-slate-200 hover:bg-white dark:border-saas-border dark:bg-saas-bg"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-saas-text">
              {slice.name}
            </span>
            <span className="tabular-nums text-slate-400">{slice.count}</span>
            <span className="w-16 text-right font-bold tabular-nums text-slate-800 dark:text-saas-text">
              {formatDealCurrencyShort(slice.value)}
            </span>
          </li>
        ))}
      </ul>
    </BreakdownPanel>
  )
}
