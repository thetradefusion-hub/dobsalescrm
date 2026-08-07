'use client'

import { cn } from '@/lib/utils'

interface SparklineProps {
  values: number[]
  className?: string
  stroke?: string
  fill?: string
  height?: number
  /** Show glowing end-point marker */
  showEndDot?: boolean
}

/** Tiny SVG area/line chart for KPI cards — gradient fill + end accent. */
export function Sparkline({
  values,
  className,
  stroke = 'currentColor',
  fill = 'currentColor',
  height = 36,
  showEndDot = true,
}: SparklineProps) {
  const pts = values.length > 0 ? values : [0, 0]
  const max = Math.max(...pts, 1)
  const min = Math.min(...pts, 0)
  const span = Math.max(max - min, 1)
  const w = 100
  const h = height
  const step = pts.length > 1 ? w / (pts.length - 1) : w
  const uid = `sp-${Math.abs(hashColor(stroke))}`

  const coords = pts.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / span) * (h - 6) - 3
    return { x, y }
  })

  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  const last = coords[coords.length - 1]

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('h-8 w-full overflow-visible', className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.28} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${uid}-stroke`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
          <stop offset="100%" stopColor={stroke} stopOpacity={1} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${uid}-fill)`} />
      <polyline
        points={line}
        fill="none"
        stroke={`url(#${uid}-stroke)`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showEndDot && last ? (
        <circle
          cx={last.x}
          cy={last.y}
          r={2.2}
          fill={stroke}
          stroke="#fff"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  )
}

function hashColor(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
