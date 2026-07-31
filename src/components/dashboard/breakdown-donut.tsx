'use client'

import { PieChart } from 'lucide-react'
import { formatDealCurrencyShort } from '@/lib/currency'
import type { BreakdownDonutData } from '@/lib/dashboard/types'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

interface BreakdownDonutProps {
  title: string
  description?: string
  data: BreakdownDonutData | null
  loading?: boolean
  /** Center metric: pipeline value vs lead count */
  mode?: 'value' | 'count'
  emptyHint?: string
}

export function BreakdownDonut({
  title,
  description,
  data,
  loading,
  mode = 'value',
  emptyHint = 'Tag contacts to see this breakdown.',
}: BreakdownDonutProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-sm font-semibold text-wa-text">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-wa-muted/80">{description}</p>
        )}
      </header>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {loading || !data ? (
          <Skeleton className="h-56 w-full" />
        ) : data.slices.length === 0 ? (
          <EmptyState icon={PieChart} title="No data yet" hint={emptyHint} />
        ) : (
          <>
            <Donut data={data} mode={mode} />
            <ul className="mt-5 max-h-44 space-y-2 overflow-y-auto">
              {data.slices.map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-xs">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-wa-text/90">{s.name}</span>
                  <span className="text-wa-text/90 tabular-nums">
                    {mode === 'value'
                      ? formatDealCurrencyShort(s.totalValue)
                      : s.count}
                  </span>
                </li>
              ))}
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
}: {
  data: BreakdownDonutData
  mode: 'value' | 'count'
}) {
  const size = 200
  const r = 80
  const ringWidth = 18
  const cx = size / 2
  const cy = size / 2

  const totalRaw =
    mode === 'value'
      ? data.totalValue || 1
      : data.totalCount || 1
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
  const centerSub = mode === 'value' ? 'Total Pipeline' : 'Total Leads'

  return (
    <div className="flex items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-44 w-44"
        role="img"
        aria-label={centerSub}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--wa-chart-grid)"
          strokeWidth={ringWidth}
        />
        {segments.map((seg) => (
          <path
            key={seg.id}
            d={seg.path}
            fill="none"
            stroke={seg.color}
            strokeWidth={ringWidth}
            strokeLinecap="butt"
          />
        ))}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          className="fill-wa-text text-[16px] font-semibold tabular-nums"
        >
          {centerMain}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className="fill-wa-muted/80 text-[10px]"
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
