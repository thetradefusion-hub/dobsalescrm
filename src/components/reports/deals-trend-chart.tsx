'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { DealsTrendPoint } from '@/lib/reports/types'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Skeleton } from '@/components/dashboard/skeleton'
import { cn } from '@/lib/utils'

const VB_W = 800
const VB_H = 280
const PADDING = { top: 20, right: 20, bottom: 36, left: 44 }

const COLORS = {
  created: '#3b82f6',
  won: '#22c55e',
  lost: '#ef4444',
} as const

interface DealsTrendChartProps {
  data: DealsTrendPoint[] | null
  loading: boolean
}

export function DealsTrendChart({ data, loading }: DealsTrendChartProps) {
  const { maxY, ticks, totals } = useMemo(() => {
    const arr = data ?? []
    const max = arr.reduce((m, p) => Math.max(m, p.created, p.won, p.lost), 0)
    const { maxY, ticks } = niceScale(max)
    const totals = arr.reduce(
      (acc, p) => {
        acc.created += p.created
        acc.won += p.won
        acc.lost += p.lost
        return acc
      },
      { created: 0, won: 0, lost: 0 },
    )
    return { maxY, ticks, totals }
  }, [data])

  const empty =
    !!data && data.every((p) => p.created === 0 && p.won === 0 && p.lost === 0)

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="flex flex-col gap-3 border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <div>
          <h2 className="text-sm font-semibold text-wa-text">Lead funnel trend</h2>
          <p className="mt-0.5 text-xs text-wa-muted/80">
            Daily new leads, wins, and losses in this period
          </p>
        </div>
        {!loading && data && !empty && (
          <div className="flex flex-wrap gap-2">
            <StatPill color={COLORS.created} label="New" value={totals.created} />
            <StatPill color={COLORS.won} label="Won" value={totals.won} />
            <StatPill color={COLORS.lost} label="Lost" value={totals.lost} />
          </div>
        )}
      </header>

      <div className="p-4 sm:p-5">
        {loading || !data ? (
          <Skeleton className="h-[280px] w-full" />
        ) : empty ? (
          <EmptyState
            icon={TrendingUp}
            title="No lead activity in this range"
            hint="Create or close leads to see the trend chart."
          />
        ) : (
          <TrendChart data={data} maxY={maxY} ticks={ticks} />
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-5 border-t border-wa-border px-5 py-3 text-xs text-wa-muted">
        <LegendSwatch color={COLORS.created} label="New leads" />
        <LegendSwatch color={COLORS.won} label="Won" />
        <LegendSwatch color={COLORS.lost} label="Lost" />
      </footer>
    </section>
  )
}

function StatPill({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: number
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-wa-border bg-wa-surface/50 px-2.5 py-1 text-[11px] font-medium text-wa-text">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
      <span className="tabular-nums text-wa-muted">{value}</span>
    </span>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  )
}

function TrendChart({
  data,
  maxY,
  ticks,
}: {
  data: DealsTrendPoint[]
  maxY: number
  ticks: number[]
}) {
  const [hover, setHover] = useState<{
    idx: number
    tooltipLeftPx: number
  } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const chartW = VB_W - PADDING.left - PADDING.right
  const chartH = VB_H - PADDING.top - PADDING.bottom
  const groupW = data.length > 0 ? chartW / data.length : chartW
  const barGap = Math.min(4, groupW * 0.08)
  const barW = Math.max(2, (groupW - barGap * 2) / 3.4)

  const yFor = (v: number) =>
    maxY === 0
      ? PADDING.top + chartH
      : PADDING.top + chartH - (v / maxY) * chartH

  const groupX = (i: number) => PADDING.left + i * groupW

  useEffect(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return

    const onMove = (e: MouseEvent) => {
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const local = pt.matrixTransform(ctm.inverse())
      if (local.x < PADDING.left || local.x > VB_W - PADDING.right) {
        setHover(null)
        return
      }
      const idx = Math.max(
        0,
        Math.min(data.length - 1, Math.floor((local.x - PADDING.left) / groupW)),
      )
      const midVbX = groupX(idx) + groupW / 2
      const midPt = svg.createSVGPoint()
      midPt.x = midVbX
      midPt.y = 0
      const screen = midPt.matrixTransform(ctm)
      setHover({
        idx,
        tooltipLeftPx: screen.x - wrap.getBoundingClientRect().left,
      })
    }
    const onLeave = () => setHover(null)
    svg.addEventListener('mousemove', onMove)
    svg.addEventListener('mouseleave', onLeave)
    return () => {
      svg.removeEventListener('mousemove', onMove)
      svg.removeEventListener('mouseleave', onLeave)
    }
  }, [data, groupW])

  const hovered = hover !== null ? data[hover.idx] : null
  const labelStride = Math.max(1, Math.ceil(data.length / 8))

  const series = [
    { key: 'created' as const, color: COLORS.created, offset: 0 },
    { key: 'won' as const, color: COLORS.won, offset: 1 },
    { key: 'lost' as const, color: COLORS.lost, offset: 2 },
  ]

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-[260px] w-full sm:h-[280px]"
        role="img"
        aria-label="Lead activity by day"
      >
        {/* Grid + Y labels */}
        {ticks.map((t) => {
          const y = yFor(t)
          return (
            <g key={t}>
              <line
                x1={PADDING.left}
                x2={VB_W - PADDING.right}
                y1={y}
                y2={y}
                stroke="var(--wa-chart-grid)"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-wa-muted text-[11px]"
              >
                {t}
              </text>
            </g>
          )
        })}

        {/* Baseline */}
        <line
          x1={PADDING.left}
          x2={VB_W - PADDING.right}
          y1={PADDING.top + chartH}
          y2={PADDING.top + chartH}
          stroke="var(--wa-chart-grid)"
          strokeWidth={1.5}
        />

        {/* Hover band */}
        {hover !== null && (
          <rect
            x={groupX(hover.idx)}
            y={PADDING.top}
            width={groupW}
            height={chartH}
            fill="currentColor"
            className="text-wa-green/10"
          />
        )}

        {/* Grouped bars */}
        {data.map((p, i) => {
          const gx = groupX(i) + barGap
          return (
            <g key={p.day}>
              {series.map((s) => {
                const val = p[s.key]
                const h = maxY === 0 ? 0 : (val / maxY) * chartH
                const x = gx + s.offset * (barW + 1.5)
                const y = PADDING.top + chartH - h
                if (val <= 0) {
                  // Tiny tick so empty days still show structure
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={PADDING.top + chartH - 2}
                      width={barW}
                      height={2}
                      rx={1}
                      fill={s.color}
                      opacity={0.2}
                    />
                  )
                }
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, 3)}
                    rx={2}
                    fill={s.color}
                    opacity={hover === null || hover.idx === i ? 0.92 : 0.35}
                  />
                )
              })}
            </g>
          )
        })}

        {/* X labels */}
        {data.map((p, i) =>
          i % labelStride === 0 || i === data.length - 1 ? (
            <text
              key={`lbl-${p.day}`}
              x={groupX(i) + groupW / 2}
              y={VB_H - 10}
              textAnchor="middle"
              className="fill-wa-muted text-[10px]"
            >
              {shortDayLabel(p.day)}
            </text>
          ) : null,
        )}
      </svg>

      {hovered && hover !== null && (
        <div
          className={cn(
            'pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-wa-border bg-wa-panel/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur-sm',
          )}
          style={{ left: `${hover.tooltipLeftPx}px` }}
        >
          <div className="font-semibold text-wa-text">
            {longDayLabel(hovered.day)}
          </div>
          <div className="mt-1.5 space-y-1">
            <TooltipRow color={COLORS.created} label="New leads" value={hovered.created} />
            <TooltipRow color={COLORS.won} label="Won" value={hovered.won} />
            <TooltipRow color={COLORS.lost} label="Lost" value={hovered.lost} />
          </div>
        </div>
      )}
    </div>
  )
}

function TooltipRow({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-wa-muted">
        <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className="font-semibold tabular-nums text-wa-text">{value}</span>
    </div>
  )
}

function shortDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function longDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Even integer ticks — avoids awkward 0,1,3,4,5 scales. */
function niceScale(max: number): { maxY: number; ticks: number[] } {
  if (max <= 0) {
    return { maxY: 4, ticks: [0, 1, 2, 3, 4] }
  }
  const roughStep = max / 4
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const residual = roughStep / mag
  const niceResidual =
    residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10
  const step = niceResidual * mag
  const maxY = Math.max(step * 4, Math.ceil(max / step) * step)
  const ticks: number[] = []
  for (let v = 0; v <= maxY + 1e-9; v += step) {
    ticks.push(Math.round(v))
  }
  if (ticks[ticks.length - 1] !== maxY) ticks.push(maxY)
  return { maxY, ticks }
}
