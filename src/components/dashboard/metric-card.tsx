import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

export type MetricAccent = 'green' | 'blue' | 'amber' | 'teal'

const ACCENT: Record<
  MetricAccent,
  { bar: string; icon: string; glow: string }
> = {
  green: {
    bar: 'bg-wa-green',
    icon: 'bg-wa-green/10 text-wa-green ring-wa-green/25',
    glow: 'group-hover:shadow-wa-green/10',
  },
  blue: {
    bar: 'bg-blue-500',
    icon: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
    glow: 'group-hover:shadow-blue-500/10',
  },
  amber: {
    bar: 'bg-amber-500',
    icon: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
    glow: 'group-hover:shadow-amber-500/10',
  },
  teal: {
    bar: 'bg-wa-teal',
    icon: 'bg-wa-teal/10 text-wa-teal ring-wa-teal/25',
    glow: 'group-hover:shadow-wa-teal/10',
  },
}

interface MetricCardProps {
  title: string
  value: string
  icon: ComponentType<{ className?: string }>
  accent?: MetricAccent
  delta?: {
    sign: number
    label: string
  }
  subtitle?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  accent = 'green',
  delta,
  subtitle,
  className,
}: MetricCardProps) {
  const styles = ACCENT[accent]

  return (
    <div
      className={cn(
        'group relative shrink-0 snap-center overflow-hidden rounded-2xl border border-wa-border/80 bg-wa-panel/95 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all duration-200 hover:border-wa-green/30 hover:shadow-md active:scale-[0.99] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] lg:rounded-xl lg:p-5 lg:shadow-sm lg:active:scale-100',
        styles.glow,
        className,
      )}
    >
      <div
        className={cn('absolute inset-x-0 top-0 h-0.5 opacity-80', styles.bar)}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-wa-muted">{title}</p>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
            styles.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <p className="mt-3 text-2xl leading-none font-bold tabular-nums tracking-tight text-wa-text lg:mt-4 lg:text-[28px]">
        {value}
      </p>
      {delta ? (
        <DeltaRow sign={delta.sign} label={delta.label} />
      ) : subtitle ? (
        <p className="mt-2.5 text-sm text-wa-muted">{subtitle}</p>
      ) : null}
    </div>
  )
}

function DeltaRow({ sign, label }: { sign: number; label: string }) {
  const tone =
    sign > 0
      ? 'text-wa-green'
      : sign < 0
        ? 'text-red-500 dark:text-red-400'
        : 'text-wa-muted'
  const Arrow = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus
  return (
    <div className={cn('mt-2.5 flex items-center gap-1.5 text-sm', tone)}>
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full',
          sign > 0 && 'bg-wa-green/10',
          sign < 0 && 'bg-red-500/10',
          sign === 0 && 'bg-wa-surface',
        )}
      >
        <Arrow className="h-3 w-3" aria-hidden />
      </span>
      <span className="line-clamp-1 tabular-nums">{label}</span>
    </div>
  )
}
