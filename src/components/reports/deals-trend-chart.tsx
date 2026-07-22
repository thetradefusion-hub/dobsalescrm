'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { DealsTrendPoint } from '@/lib/reports/types'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Skeleton } from '@/components/dashboard/skeleton'

const VB_W = 760
const VB_H = 240
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 }

interface DealsTrendChartProps {
  data: DealsTrendPoint[] | null
  loading: boolean
}

export function DealsTrendChart({ data, loading }: DealsTrendChartProps) {
  const { maxY, niceTicks } = useMemo(() => {
    const arr = data ?? []
    const max = arr.reduce(
      (m, p) => Math.max(m, p.created, p.won, p.lost),
      0,
    )
    const ceil = niceCeil(max)
    const ticks = [0, ceil / 4, ceil / 2, (3 * ceil) / 4, ceil].map((v) =>
      Math.round(v),
    )
    return { maxY: ceil, niceTicks: Array.from(new Set(ticks)) }
  }, [data])

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-sm font-semibold text-wa-text">Leads & Deals Trend</h2>
        <p className="mt-0.5 text-xs text-wa-muted/80">
          New leads created, won, and lost per day
        </p>
      </header>
      <div className="p-4 sm:p-5">
        {loading || !data ? (
          <Skeleton className="h-[240px] w-full" />
        ) : data.every((p) => p.created === 0 && p.won === 0 && p.lost === 0) ? (
          <EmptyState
            icon={TrendingUp}
            title="No deal activity in this range"
            hint="Create leads or close deals to see trends here."
          />
        ) : (
          <TrendSvg data={data} maxY={maxY} ticks={niceTicks} />
        )}
      </div>
      <footer className="flex flex-wrap items-center gap-4 border-t border-wa-border px-5 py-3 text-xs text-wa-muted">
        <LegendDot color="#3b82f6" label="New leads" />
        <LegendDot color="#22c55e" label="Won" />
        <LegendDot color="#ef4444" label="Lost" />
      </footer>
    </section>
  )
}

function TrendSvg({
  data,
  maxY,
  ticks,
}: {
  data: DealsTrendPoint[]
  maxY: number
  ticks: number[]
}) {
  const [hover, setHover] = useState<{ idx: number; tooltipLeftPx: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const chartW = VB_W - PADDING.left - PADDING.right
  const chartH = VB_H - PADDING.top - PADDING.bottom
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0
  const yFor = (v: number) =>
    maxY === 0 ? PADDING.top + chartH : PADDING.top + chartH - (v / maxY) * chartH
  const xFor = (i: number) => PADDING.left + i * stepX

  const pathFor = (key: keyof Pick<DealsTrendPoint, 'created' | 'won' | 'lost'>) =>
    data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(p[key])}`).join(' ')

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
      if (local.x < PADDING.left - 8 || local.x > VB_W - PADDING.right + 8) {
        setHover(null)
        return
      }
      const idx = Math.max(
        0,
        Math.min(data.length - 1, Math.round((local.x - PADDING.left) / (stepX || 1))),
      )
      const dataPointVbX = PADDING.left + idx * stepX
      const dataPointPt = svg.createSVGPoint()
      dataPointPt.x = dataPointVbX
      dataPointPt.y = 0
      const screen = dataPointPt.matrixTransform(ctm)
      setHover({ idx, tooltipLeftPx: screen.x - wrap.getBoundingClientRect().left })
    }
    const onLeave = () => setHover(null)
    svg.addEventListener('mousemove', onMove)
    svg.addEventListener('mouseleave', onLeave)
    return () => {
      svg.removeEventListener('mousemove', onMove)
      svg.removeEventListener('mouseleave', onLeave)
    }
  }, [data, stepX])

  const hovered = hover !== null ? data[hover.idx] : null
  const labelStride = Math.max(1, Math.ceil(data.length / 6))

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-[240px] w-full" role="img">
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
                strokeDasharray="3 3"
              />
              <text
                x={PADDING.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-wa-muted/80 text-[10px]"
              >
                {t}
              </text>
            </g>
          )
        })}
        {data.map((p, i) =>
          i % labelStride === 0 ? (
            <text
              key={p.day}
              x={xFor(i)}
              y={VB_H - 8}
              textAnchor="middle"
              className="fill-wa-muted/80 text-[10px]"
            >
              {shortDayLabel(p.day)}
            </text>
          ) : null,
        )}
        <path d={pathFor('created')} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" />
        <path d={pathFor('won')} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" />
        <path d={pathFor('lost')} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-wa-border bg-wa-deep px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: `${hover.tooltipLeftPx}px` }}
        >
          <div className="font-medium text-wa-text">{longDayLabel(hovered.day)}</div>
          <div className="mt-1 flex flex-col gap-0.5 text-wa-muted">
            <span>{hovered.created} new</span>
            <span className="text-wa-green">{hovered.won} won</span>
            <span className="text-red-400">{hovered.lost} lost</span>
          </div>
        </div>
      )}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function shortDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function longDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function niceCeil(max: number): number {
  if (max <= 0) return 4
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const n = max / pow
  let nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return nice * pow
}
