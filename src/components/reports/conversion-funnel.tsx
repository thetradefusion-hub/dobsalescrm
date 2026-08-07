'use client'

import { Filter, IndianRupee, Sparkles, Trophy, UserPlus } from 'lucide-react'
import type { ReportSummary } from '@/lib/reports/types'
import { formatDealCurrencyShort } from '@/lib/currency'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Skeleton } from '@/components/dashboard/skeleton'

interface ConversionFunnelProps {
  summary: ReportSummary | null | undefined
  loading: boolean
}

const STEP_COLORS = ['#6366f1', '#0ea5e9', '#10b981'] as const

export function ConversionFunnel({ summary, loading }: ConversionFunnelProps) {
  const created = summary?.newLeads.current ?? 0
  const won = summary?.wonDeals.current ?? 0
  const lost = summary?.lostDeals.current ?? 0
  const closed = won + lost

  const steps = [
    { key: 'created', label: 'New leads', value: created, icon: UserPlus },
    { key: 'closed', label: 'Reached a decision', value: closed, icon: Filter },
    { key: 'won', label: 'Won', value: won, icon: Trophy },
  ]

  const peak = Math.max(created, closed, won, 1)
  const empty = created === 0 && closed === 0

  return (
    <section className="premium-panel flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-3 dark:border-saas-border">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-200/70">
          <Sparkles className="size-3.5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-slate-800 dark:text-saas-text">
            Conversion funnel
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            Created to closed-won in this period
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : empty ? (
          <EmptyState
            icon={Sparkles}
            title="No leads in this range"
            hint="Create leads to see how they convert."
          />
        ) : (
          <>
            <ul className="space-y-3">
              {steps.map((step, i) => {
                const pct = Math.round((step.value / peak) * 100)
                const share =
                  created > 0 ? Math.round((step.value / created) * 100) : 0
                const Icon = step.icon
                return (
                  <li key={step.key}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-saas-text">
                        <Icon
                          className="size-3.5"
                          style={{ color: STEP_COLORS[i] }}
                        />
                        {step.label}
                      </span>
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-saas-text">
                          {step.value}
                        </span>
                        <span className="text-[10px] font-semibold tabular-nums text-slate-400">
                          {share}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-saas-bg">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${Math.max(pct, step.value > 0 ? 4 : 0)}%`,
                          background: `linear-gradient(90deg, ${STEP_COLORS[i]}, ${STEP_COLORS[i]}b3)`,
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="mt-auto grid grid-cols-3 gap-1.5 pt-4">
              <FunnelStat
                label="Win rate"
                value={
                  summary?.conversionRate != null
                    ? `${summary.conversionRate}%`
                    : '—'
                }
                tone="text-emerald-600"
              />
              <FunnelStat label="Lost" value={String(lost)} tone="text-rose-600" />
              <FunnelStat
                label="Revenue"
                value={formatDealCurrencyShort(summary?.revenueWon.current ?? 0)}
                tone="text-amber-600"
                icon={IndianRupee}
              />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function FunnelStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  tone: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5 text-center dark:border-saas-border dark:bg-saas-bg">
      <p
        className={`flex items-center justify-center gap-0.5 text-xs font-bold tabular-nums ${tone}`}
      >
        {Icon ? <Icon className="size-3" /> : null}
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-slate-400">{label}</p>
    </div>
  )
}
