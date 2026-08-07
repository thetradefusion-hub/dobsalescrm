'use client'

import { PieChart } from 'lucide-react'
import { formatDealCurrencyShort } from '@/lib/currency'
import type { BreakdownDonutData } from '@/lib/dashboard/types'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'
import { cn } from '@/lib/utils'

interface BreakdownDonutProps {
  title: string
  description?: string
  data: BreakdownDonutData | null
  loading?: boolean
  mode?: 'value' | 'count'
  emptyHint?: string
  className?: string
  /** Tighter layout for dashboard grid */
  compact?: boolean
  icon?: React.ComponentType<{ className?: string }>
  /** Tailwind bg/text pair for the header icon tile. */
  iconAccent?: string
}

export function BreakdownDonut({
  title,
  description,
  data,
  loading,
  mode = 'value',
  emptyHint = 'Tag contacts to see this breakdown.',
  className,
  compact = true,
  icon: Icon,
  iconAccent = 'bg-violet-50 text-violet-600',
}: BreakdownDonutProps) {
  return (
    <section
      className={cn(
        'premium-panel flex h-full flex-col overflow-hidden',
        className,
      )}
    >
      <header
        className={cn(
          'flex items-center gap-2 border-b border-slate-100 dark:border-saas-border',
          compact ? 'px-3.5 py-3' : 'px-4 py-3',
        )}
      >
        {Icon ? (
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-current/15',
              iconAccent,
            )}
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-slate-800 dark:text-saas-text">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      </header>

      <div className={cn('flex flex-1 flex-col', compact ? 'p-3' : 'p-4')}>
        {loading || !data ? (
          <Skeleton className={cn('w-full', compact ? 'h-40' : 'h-56')} />
        ) : data.slices.length === 0 ? (
          <EmptyState icon={PieChart} title="No data yet" hint={emptyHint} />
        ) : (
          <>
            <Donut data={data} mode={mode} compact={compact} />
            <ul
              className={cn(
                'space-y-1.5 overflow-y-auto',
                compact ? 'mt-3 max-h-28' : 'mt-5 max-h-44 space-y-2',
              )}
            >
              {data.slices.map((s) => {
                const total =
                  mode === 'value'
                    ? data.totalValue || 1
                    : data.totalCount || 1
                const share =
                  ((mode === 'value' ? s.totalValue : s.count) / total) * 100
                return (
                  <li key={s.id} className="text-[11px]">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: s.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-saas-muted">
                        {s.name}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-800 dark:text-saas-text">
                        {mode === 'value'
                          ? formatDealCurrencyShort(s.totalValue)
                          : s.count}
                      </span>
                    </div>
                    <div className="ml-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-saas-bg">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(4, Math.min(100, share))}%`,
                          background: s.color,
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function Donut({
  data,
  mode,
  compact,
}: {
  data: BreakdownDonutData
  mode: 'value' | 'count'
  compact?: boolean
}) {
  const size = compact ? 148 : 200
  const r = compact ? 54 : 80
  const ringWidth = compact ? 14 : 18
  const cx = size / 2
  const cy = size / 2

  const totalRaw =
    mode === 'value' ? data.totalValue || 1 : data.totalCount || 1
  const weights = data.slices.map((s) =>
    mode === 'value' ? s.totalValue / totalRaw : s.count / totalRaw,
  )
  const minFrac = 0.02
  const floored = weights.map((x) => Math.max(x, minFrac))
  const floorSum = floored.reduce((a, b) => a + b, 0)
  const shares = floored.map((x) => x / floorSum)

  const offsets: number[] = [0]
  for (let i = 0; i < shares.length; i++) offsets.push(offsets[i] + shares[i])
  const segments = data.slices.map((s, i) => {
    const start = offsets[i] * Math.PI * 2 - Math.PI / 2
    const end = offsets[i + 1] * Math.PI * 2 - Math.PI / 2
    return { path: arcPath(cx, cy, r, start, end), color: s.color, id: s.id }
  })

  const centerMain =
    mode === 'value'
      ? formatDealCurrencyShort(data.totalValue)
      : String(data.totalCount)
  const centerSub = mode === 'value' ? 'Pipeline' : 'Leads'

  return (
    <div className="flex items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={cn(compact ? 'h-32 w-32' : 'h-44 w-44')}
        role="img"
        aria-label={centerSub}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={ringWidth}
        />
        {segments.map((seg) => (
          <path
            key={seg.id}
            d={seg.path}
            fill="none"
            stroke={seg.color}
            strokeWidth={ringWidth}
            strokeLinecap="round"
            className="transition-opacity hover:opacity-90"
          />
        ))}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-slate-800 text-[13px] font-bold tabular-nums dark:fill-saas-text"
        >
          {centerMain}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          className="fill-slate-400 text-[9px] font-medium"
        >
          {centerSub}
        </text>
      </svg>
    </div>
  )
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
): string {
  const x1 = cx + r * Math.cos(startRad)
  const y1 = cy + r * Math.sin(startRad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cy + r * Math.sin(endRad)
  const largeArc = endRad - startRad > Math.PI ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
}
