'use client';

import type { ComponentType } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/enterprise/sparkline';

export type EnterpriseMetricAccent =
  | 'violet'
  | 'blue'
  | 'green'
  | 'orange'
  | 'pink'
  | 'red';

const ACCENT: Record<
  EnterpriseMetricAccent,
  { icon: string; stroke: string; bar: string; glow: string }
> = {
  violet: {
    icon: 'bg-violet-100 text-violet-600 ring-violet-200/70',
    stroke: '#7c3aed',
    bar: 'from-violet-500 to-indigo-400',
    glow: 'group-hover:shadow-[0_14px_30px_-16px_rgba(124,58,237,0.55)]',
  },
  blue: {
    icon: 'bg-sky-100 text-sky-600 ring-sky-200/70',
    stroke: '#0ea5e9',
    bar: 'from-sky-500 to-cyan-400',
    glow: 'group-hover:shadow-[0_14px_30px_-16px_rgba(14,165,233,0.55)]',
  },
  green: {
    icon: 'bg-emerald-100 text-emerald-600 ring-emerald-200/70',
    stroke: '#10b981',
    bar: 'from-emerald-500 to-teal-400',
    glow: 'group-hover:shadow-[0_14px_30px_-16px_rgba(16,185,129,0.55)]',
  },
  orange: {
    icon: 'bg-amber-100 text-amber-600 ring-amber-200/70',
    stroke: '#f59e0b',
    bar: 'from-amber-500 to-orange-400',
    glow: 'group-hover:shadow-[0_14px_30px_-16px_rgba(245,158,11,0.55)]',
  },
  pink: {
    icon: 'bg-rose-100 text-rose-600 ring-rose-200/70',
    stroke: '#f43f5e',
    bar: 'from-rose-500 to-pink-400',
    glow: 'group-hover:shadow-[0_14px_30px_-16px_rgba(244,63,94,0.55)]',
  },
  red: {
    icon: 'bg-red-100 text-red-600 ring-red-200/70',
    stroke: '#ef4444',
    bar: 'from-red-500 to-rose-400',
    glow: 'group-hover:shadow-[0_14px_30px_-16px_rgba(239,68,68,0.55)]',
  },
};

interface EnterpriseMetricCardProps {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  accent?: EnterpriseMetricAccent;
  subtitle?: string;
  deltaLabel?: string;
  deltaSign?: number;
  sparkline?: number[];
  className?: string;
  compact?: boolean;
}

export function EnterpriseMetricCard({
  title,
  value,
  icon: Icon,
  accent = 'violet',
  subtitle,
  deltaLabel,
  deltaSign = 0,
  sparkline,
  className,
  compact = true,
}: EnterpriseMetricCardProps) {
  const styles = ACCENT[accent];
  const Arrow = deltaSign > 0 ? ArrowUp : deltaSign < 0 ? ArrowDown : Minus;

  return (
    <div
      className={cn(
        'group dark:border-saas-border dark:bg-saas-card relative overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300/80',
        styles.glow,
        compact ? 'p-3 pt-3.5' : 'p-4 pt-4.5',
        className
      )}
    >
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80 transition-opacity group-hover:opacity-100',
          styles.bar
        )}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            {title}
          </p>
          <p
            className={cn(
              'dark:text-saas-text mt-1.5 min-w-0 truncate font-bold tracking-tight text-slate-900 tabular-nums',
              compact
                ? 'text-lg leading-none sm:text-[22px]'
                : 'text-2xl leading-none sm:text-[28px]'
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105',
            compact ? 'size-9' : 'size-11 rounded-2xl',
            styles.icon
          )}
        >
          <Icon className={compact ? 'size-4' : 'size-[19px]'} />
        </div>
      </div>

      {(deltaLabel || subtitle) && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          {deltaLabel ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
                deltaSign > 0 && 'bg-emerald-50 text-emerald-700',
                deltaSign < 0 && 'bg-rose-50 text-rose-600',
                deltaSign === 0 && 'bg-slate-100 text-slate-500'
              )}
            >
              <Arrow className="size-3" />
              {deltaLabel}
            </span>
          ) : null}
          {subtitle ? (
            <span className="truncate text-slate-400">{subtitle}</span>
          ) : null}
        </div>
      )}

      {sparkline && sparkline.length > 1 ? (
        <div className={cn(compact ? 'mt-2.5' : 'mt-3')}>
          <Sparkline
            values={sparkline}
            stroke={styles.stroke}
            fill={styles.stroke}
            height={compact ? 26 : 34}
          />
        </div>
      ) : null}
    </div>
  );
}
