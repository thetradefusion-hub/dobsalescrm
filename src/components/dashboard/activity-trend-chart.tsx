'use client'

import { useId, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, MessagesSquare } from 'lucide-react'
import type { ConversationsSeriesPoint } from '@/lib/dashboard/types'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/dashboard/skeleton'

const VB_W = 640
const VB_H = 168
const PAD = { top: 14, right: 12, bottom: 26, left: 36 }

interface ActivityTrendChartProps {
  series: ConversationsSeriesPoint[] | null
  loading?: boolean
  className?: string
}

/** Compact dual-series area chart for dashboard messaging pulse. */
export function ActivityTrendChart({
  series,
  loading,
  className,
}: ActivityTrendChartProps) {
  const uid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)

  const data = series ?? []
  const { maxY, pathIn, pathOut, areaIn, areaOut, points } = useMemo(() => {
    const max = Math.max(
      1,
      ...data.map((p) => Math.max(p.incoming, p.outgoing)),
    )
    const ceil = niceCeil(max)
    const plotW = VB_W - PAD.left - PAD.right
    const plotH = VB_H - PAD.top - PAD.bottom
    const n = Math.max(data.length - 1, 1)

    const pts = data.map((p, i) => {
      const x = PAD.left + (i / n) * plotW
      const yIn = PAD.top + plotH - (p.incoming / ceil) * plotH
      const yOut = PAD.top + plotH - (p.outgoing / ceil) * plotH
      return { ...p, x, yIn, yOut }
    })

    return {
      maxY: ceil,
      pathIn: toSmoothLine(pts.map((p) => ({ x: p.x, y: p.yIn }))),
      pathOut: toSmoothLine(pts.map((p) => ({ x: p.x, y: p.yOut }))),
      areaIn: toArea(pts.map((p) => ({ x: p.x, y: p.yIn })), plotH),
      areaOut: toArea(pts.map((p) => ({ x: p.x, y: p.yOut })), plotH),
      points: pts,
    }
  }, [data])

  const totalIn = data.reduce((s, p) => s + p.incoming, 0)
  const totalOut = data.reduce((s, p) => s + p.outgoing, 0)
  const active = hover != null ? points[hover] : null

  if (loading) {
    return (
      <div
        className={cn(
          'h-[220px] animate-pulse rounded-2xl border border-slate-200/80 bg-white',
          className,
        )}
      />
    )
  }

  return (
    <section
      className={cn(
        'premium-panel flex flex-col overflow-hidden',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-2.5 dark:border-saas-border">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15">
            <MessagesSquare className="size-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-saas-text">
              Message activity
            </h3>
            <p className="text-[11px] text-slate-400">Last {data.length || 7} days</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1 font-semibold text-sky-600">
            <ArrowDownRight className="size-3.5" />
            {totalIn}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
            <ArrowUpRight className="size-3.5" />
            {totalOut}
          </span>
        </div>
      </header>

      <div className="relative px-2 pb-1 pt-1">
        {data.length === 0 ? (
          <div className="flex h-[160px] items-center justify-center">
            <Skeleton className="h-24 w-full opacity-40" />
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-[168px] w-full"
            role="img"
            aria-label="Incoming and outgoing messages"
          >
            <defs>
              <linearGradient id={`${uid}-in`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`${uid}-out`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>

            {[0, 0.5, 1].map((t) => {
              const y = PAD.top + (VB_H - PAD.top - PAD.bottom) * (1 - t)
              return (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={VB_W - PAD.right}
                    y1={y}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="3 4"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px]"
                  >
                    {Math.round(maxY * t)}
                  </text>
                </g>
              )
            })}

            <path d={areaIn} fill={`url(#${uid}-in)`} />
            <path d={areaOut} fill={`url(#${uid}-out)`} />
            <path
              d={pathIn}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathOut}
              fill="none"
              stroke="#10b981"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((p, i) => (
              <rect
                key={p.day ?? i}
                x={p.x - (VB_W - PAD.left - PAD.right) / (points.length * 2)}
                y={PAD.top}
                width={(VB_W - PAD.left - PAD.right) / points.length}
                height={VB_H - PAD.top - PAD.bottom}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}

            {active ? (
              <>
                <line
                  x1={active.x}
                  x2={active.x}
                  y1={PAD.top}
                  y2={VB_H - PAD.bottom}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <circle cx={active.x} cy={active.yIn} r={3.5} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />
                <circle cx={active.x} cy={active.yOut} r={3.5} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
              </>
            ) : null}

            {points
              .filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 4) === 0)
              .map((p, i) => (
                <text
                  key={`lbl-${i}`}
                  x={p.x}
                  y={VB_H - 8}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px]"
                >
                  {formatDay(p.day)}
                </text>
              ))}
          </svg>
        )}

        {active ? (
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[11px] shadow-md backdrop-blur dark:border-saas-border dark:bg-saas-card">
            <p className="font-semibold text-slate-700 dark:text-saas-text">
              {formatDay(active.day, true)}
            </p>
            <p className="text-sky-600">In {active.incoming}</p>
            <p className="text-emerald-600">Out {active.outgoing}</p>
          </div>
        ) : null}
      </div>

      <footer className="flex items-center gap-4 border-t border-slate-100 px-3.5 py-2 text-[10px] font-medium text-slate-500 dark:border-saas-border">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-sky-500" /> Incoming
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" /> Outgoing
        </span>
      </footer>
    </section>
  )
}

function formatDay(day: string, long = false) {
  const d = new Date(day)
  if (Number.isNaN(d.getTime())) return day
  return d.toLocaleDateString([], long
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric' })
}

function niceCeil(n: number) {
  if (n <= 4) return 4
  const exp = Math.floor(Math.log10(n))
  const f = n / 10 ** exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * 10 ** exp
}

function toSmoothLine(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function toArea(pts: { x: number; y: number }[], plotH: number): string {
  if (pts.length === 0) return ''
  const line = toSmoothLine(pts)
  const base = PAD.top + plotH
  const first = pts[0]
  const last = pts[pts.length - 1]
  return `${line} L ${last.x} ${base} L ${first.x} ${base} Z`
}
