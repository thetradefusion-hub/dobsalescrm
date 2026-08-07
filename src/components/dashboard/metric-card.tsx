import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

export type MetricAccent = 'green' | 'blue' | 'amber' | 'teal' | 'red' | 'violet'

const ACCENT: Record<MetricAccent, { bar: string; icon: string; glow: string }> =
  {
    green: {
      bar: 'from-emerald-500 to-teal-400',
      icon: 'bg-emerald-50 text-emerald-600 ring-emerald-200/70',
      glow: 'hover:shadow-[0_16px_32px_-18px_rgba(16,185,129,0.55)]',
    },
    blue: {
      bar: 'from-sky-500 to-cyan-400',
      icon: 'bg-sky-50 text-sky-600 ring-sky-200/70',
      glow: 'hover:shadow-[0_16px_32px_-18px_rgba(14,165,233,0.55)]',
    },
    amber: {
      bar: 'from-amber-500 to-orange-400',
      icon: 'bg-amber-50 text-amber-600 ring-amber-200/70',
      glow: 'hover:shadow-[0_16px_32px_-18px_rgba(245,158,11,0.55)]',
    },
    teal: {
      bar: 'from-teal-500 to-emerald-400',
      icon: 'bg-teal-50 text-teal-600 ring-teal-200/70',
      glow: 'hover:shadow-[0_16px_32px_-18px_rgba(20,184,166,0.55)]',
    },
    red: {
      bar: 'from-rose-500 to-red-400',
      icon: 'bg-rose-50 text-rose-600 ring-rose-200/70',
      glow: 'hover:shadow-[0_16px_32px_-18px_rgba(244,63,94,0.55)]',
    },
    violet: {
      bar: 'from-violet-500 to-indigo-400',
      icon: 'bg-violet-50 text-violet-600 ring-violet-200/70',
      glow: 'hover:shadow-[0_16px_32px_-18px_rgba(124,58,237,0.55)]',
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
        'group premium-panel relative shrink-0 snap-center overflow-hidden p-3.5 transition duration-200 hover:-translate-y-0.5 sm:p-4',
        styles.glow,
        className,
      )}
    >
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80 transition-opacity group-hover:opacity-100',
          styles.bar,
        )}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {title}
        </p>
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105',
            styles.icon,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
      </div>

      <p className="mt-2 truncate text-xl leading-none font-bold tabular-nums tracking-tight text-slate-900 sm:text-2xl dark:text-saas-text">
        {value}
      </p>

      {delta ? (
        <DeltaRow sign={delta.sign} label={delta.label} />
      ) : subtitle ? (
        <p className="mt-2 truncate text-[11px] text-slate-400">{subtitle}</p>
      ) : null}
    </div>
  )
}

function DeltaRow({ sign, label }: { sign: number; label: string }) {
  const Arrow = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus
  return (
    <div className="mt-2 flex items-center gap-1.5 text-[11px]">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
          sign > 0 && 'bg-emerald-50 text-emerald-700',
          sign < 0 && 'bg-rose-50 text-rose-600',
          sign === 0 && 'bg-slate-100 text-slate-500',
        )}
      >
        <Arrow className="size-3" aria-hidden />
        <span className="tabular-nums">{label}</span>
      </span>
    </div>
  )
}
