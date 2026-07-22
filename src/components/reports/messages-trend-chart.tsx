'use client'

import { Thermometer } from 'lucide-react'
import type { MessagesTrendPoint } from '@/lib/reports/types'
import { EmptyState } from '@/components/dashboard/empty-state'
import { Skeleton } from '@/components/dashboard/skeleton'

const VB_W = 760
const VB_H = 220
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 }

interface MessagesTrendChartProps {
  data: MessagesTrendPoint[] | null
  loading: boolean
}

export function MessagesTrendChart({ data, loading }: MessagesTrendChartProps) {
  const maxY = Math.max(
    4,
    ...(data ?? []).flatMap((p) => [p.incoming, p.outgoing]),
  )
  const ticks = [0, maxY / 2, maxY].map(Math.round)

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-sm font-semibold text-wa-text">Messages</h2>
        <p className="mt-0.5 text-xs text-wa-muted/80">Incoming vs outgoing volume</p>
      </header>
      <div className="p-4 sm:p-5">
        {loading || !data ? (
          <Skeleton className="h-[220px] w-full" />
        ) : data.every((p) => p.incoming === 0 && p.outgoing === 0) ? (
          <EmptyState
            icon={Thermometer}
            title="No messages in this range"
            hint="Message activity will appear here once conversations start."
          />
        ) : (
          <BarSvg data={data} maxY={maxY} ticks={ticks} />
        )}
      </div>
      <footer className="flex items-center gap-4 border-t border-wa-border px-5 py-3 text-xs text-wa-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-blue-500" />
          Incoming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-wa-green" />
          Outgoing
        </span>
      </footer>
    </section>
  )
}

function BarSvg({
  data,
  maxY,
  ticks,
}: {
  data: MessagesTrendPoint[]
  maxY: number
  ticks: number[]
}) {
  const chartW = VB_W - PADDING.left - PADDING.right
  const chartH = VB_H - PADDING.top - PADDING.bottom
  const slotW = data.length > 0 ? chartW / data.length : chartW
  const barW = Math.min(12, slotW * 0.35)
  const yFor = (v: number) => PADDING.top + chartH - (v / maxY) * chartH
  const labelStride = Math.max(1, Math.ceil(data.length / 6))

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-[220px] w-full" role="img">
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
      {data.map((p, i) => {
        const cx = PADDING.left + i * slotW + slotW / 2
        const inH = chartH - (yFor(p.incoming) - PADDING.top)
        const outH = chartH - (yFor(p.outgoing) - PADDING.top)
        return (
          <g key={p.day}>
            <rect
              x={cx - barW - 1}
              y={yFor(p.incoming)}
              width={barW}
              height={Math.max(0, inH)}
              rx={2}
              fill="var(--wa-chart-incoming)"
              opacity={0.85}
            />
            <rect
              x={cx + 1}
              y={yFor(p.outgoing)}
              width={barW}
              height={Math.max(0, outH)}
              rx={2}
              fill="var(--wa-green)"
              opacity={0.85}
            />
            {i % labelStride === 0 ? (
              <text
                x={cx}
                y={VB_H - 8}
                textAnchor="middle"
                className="fill-wa-muted/80 text-[10px]"
              >
                {shortDayLabel(p.day)}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

function shortDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
