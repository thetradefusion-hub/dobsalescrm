'use client'

import { useMemo } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { localDayKey, startOfLocalDay } from '@/lib/dashboard/date-utils'
import { REPORT_PRESETS, type ReportPresetId } from '@/lib/reports/date-range'

export interface HeroHighlight {
  label: string
  value: string
}

interface ReportsHeroProps {
  rangeLabel: string
  preset: ReportPresetId
  customFrom: string
  customTo: string
  onPresetChange: (preset: ReportPresetId) => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  onRefresh: () => void
  refreshing?: boolean
  loading?: boolean
  highlights: HeroHighlight[]
}

export function ReportsHero({
  rangeLabel,
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  onRefresh,
  refreshing,
  loading,
  highlights,
}: ReportsHeroProps) {
  const todayKey = useMemo(() => localDayKey(startOfLocalDay()), [])

  return (
    <section className="premium-hero relative shrink-0 overflow-hidden p-4 sm:p-5">
      <div
        className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-sky-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/4 size-64 rounded-full bg-fuchsia-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:22px_22px]"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">
              Sales analytics
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Lead Reports
            </h1>
            <p className="mt-0.5 max-w-xl text-xs text-white/70">
              Pipeline performance, win rate and lead quality for{' '}
              <span className="font-semibold text-white/90">{rangeLabel}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white/12 px-3 text-[11px] font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
            Refresh
          </button>
        </div>

        {/* Range presets — scroll on narrow screens */}
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex w-max min-w-full items-center gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur sm:w-auto sm:flex-wrap">
            {REPORT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPresetChange(p.id)}
                className={cn(
                  'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition',
                  preset === p.id
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-white/75 hover:bg-white/15 hover:text-white',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-white/70">
              From
              <Input
                type="date"
                value={customFrom}
                max={customTo || todayKey}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className="h-9 w-[160px] border-white/25 bg-white/12 text-sm text-white backdrop-blur focus-visible:ring-white/50"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-white/70">
              To
              <Input
                type="date"
                value={customTo}
                min={customFrom}
                max={todayKey}
                onChange={(e) => onCustomToChange(e.target.value)}
                className="h-9 w-[160px] border-white/25 bg-white/12 text-sm text-white backdrop-blur focus-visible:ring-white/50"
              />
            </label>
          </div>
        ) : null}

        {/* Headline numbers */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-white/12 px-2.5 py-2 ring-1 ring-white/20 backdrop-blur"
            >
              <p className="text-sm font-bold tabular-nums leading-none text-white">
                {loading ? '—' : item.value}
              </p>
              <p className="mt-1 truncate text-[10px] font-medium text-white/70">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
