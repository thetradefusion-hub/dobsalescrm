'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

const SECTION_ACCENTS = {
  violet: 'from-violet-500 to-indigo-400 text-violet-600 bg-violet-50',
  blue: 'from-sky-500 to-cyan-400 text-sky-600 bg-sky-50',
  green: 'from-emerald-500 to-teal-400 text-emerald-600 bg-emerald-50',
  orange: 'from-amber-500 to-orange-400 text-amber-600 bg-amber-50',
  pink: 'from-rose-500 to-pink-400 text-rose-600 bg-rose-50',
} as const;

export function SectionHeader({
  title,
  description,
  action,
  icon: Icon,
  accent = 'violet',
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: keyof typeof SECTION_ACCENTS;
  className?: string;
}) {
  const tone = SECTION_ACCENTS[accent];

  return (
    <div
      className={cn(
        'mb-2 flex flex-wrap items-center justify-between gap-2',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-current/15 ring-inset',
              tone
            )}
          >
            <Icon className="size-3.5" />
          </span>
        ) : (
          <span
            className={cn(
              'h-4 w-1 shrink-0 rounded-full bg-gradient-to-b',
              tone
            )}
            aria-hidden
          />
        )}
        <div className="min-w-0">
          <h2 className="dark:text-saas-text truncate text-[13px] font-semibold tracking-tight text-slate-800">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'accent' | 'info';
  className?: string;
}) {
  const tones = {
    neutral:
      'bg-slate-100 text-slate-600 dark:bg-wa-surface dark:text-wa-muted',
    success:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    warn: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    accent:
      'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function QuickActionButton({
  href,
  label,
  icon: Icon,
  variant = 'outline',
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'outline' | 'success' | 'info';
}) {
  const styles = {
    primary:
      'border-transparent bg-violet-600 text-white shadow-md shadow-violet-600/20 hover:bg-violet-500',
    outline:
      'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    info: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
  };

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition',
        styles[variant]
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </Link>
  );
}
