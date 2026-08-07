'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatBadge } from '@/components/enterprise/section-header'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'

export interface WhatsAppLiveStats {
  unread: number
  sent: number
  delivered: number
  read: number
  replies: number
  failed: number
  activeAutomations: number
  broadcastQueue: number
}

export function WhatsAppStats({
  stats,
  loading,
  className,
}: {
  stats: WhatsAppLiveStats | null
  loading?: boolean
  className?: string
}) {
  if (loading || !stats) {
    return (
      <div
        className={cn(
          'h-full min-h-[120px] animate-pulse rounded-xl border border-slate-100 bg-white shadow-sm',
          className,
        )}
      />
    )
  }

  const funnel = [
    { label: 'Sent', value: stats.sent, color: '#64748b' },
    { label: 'Delivered', value: stats.delivered, color: '#10b981' },
    { label: 'Read', value: stats.read, color: '#0ea5e9' },
    { label: 'Replies', value: stats.replies, color: '#8b5cf6' },
  ]
  const maxBar = Math.max(1, ...funnel.map((f) => f.value))

  return (
    <div
      className={cn(
        'flex h-full flex-col premium-panel p-3',
        className,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <WhatsAppIcon className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-saas-text">
              WhatsApp today
            </h3>
            <p className="text-[10px] text-slate-400">Delivery funnel</p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            stats.activeAutomations > 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-500',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              stats.activeAutomations > 0
                ? 'animate-pulse bg-emerald-500'
                : 'bg-slate-400',
            )}
          />
          {stats.activeAutomations > 0 ? 'Live' : 'Idle'}
        </span>
      </div>

      <div className="grid flex-1 grid-cols-4 gap-1.5">
        {[
          { label: 'Unread', value: stats.unread, color: 'text-violet-600' },
          { label: 'Sent', value: stats.sent, color: 'text-slate-800' },
          { label: 'Delivered', value: stats.delivered, color: 'text-emerald-600' },
          { label: 'Read', value: stats.read, color: 'text-sky-600' },
        ].map((c) => (
          <div
            key={c.label}
            className="flex flex-col items-center justify-center rounded-lg bg-slate-50 px-1 py-2 dark:bg-saas-bg"
          >
            <p className={cn('text-lg font-bold tabular-nums leading-none', c.color)}>
              {c.value}
            </p>
            <p className="mt-1 text-[9px] font-medium text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-end gap-1.5" aria-hidden>
        {funnel.map((f) => (
          <div key={f.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-10 w-full items-end justify-center rounded-md bg-slate-50 px-1 dark:bg-saas-bg">
              <div
                className="w-full max-w-[18px] rounded-t-sm transition-all"
                style={{
                  height: `${Math.max(8, (f.value / maxBar) * 100)}%`,
                  background: `linear-gradient(180deg, ${f.color}, ${f.color}99)`,
                }}
              />
            </div>
            <span className="truncate text-[8px] font-medium text-slate-400">
              {f.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-saas-border">
        <StatBadge tone="success">{stats.replies} replies</StatBadge>
        <StatBadge tone="warn">Q {stats.broadcastQueue}</StatBadge>
        <StatBadge tone={stats.failed > 0 ? 'danger' : 'neutral'}>
          Fail {stats.failed}
        </StatBadge>
        <Link
          href="/inbox"
          className="ml-auto text-[11px] font-semibold text-violet-600 hover:underline"
        >
          Inbox
        </Link>
      </div>
    </div>
  )
}

export function HealthScoreCard({
  score,
  breakdown,
  loading,
}: {
  score: number
  breakdown: { label: string; value: number }[]
  loading?: boolean
}) {
  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-white shadow-sm" />
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (clamped / 100) * c
  const tone =
    clamped >= 70 ? '#10b981' : clamped >= 40 ? '#f59e0b' : '#f43f5e'

  return (
    <div className="premium-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-saas-text">
          Sales health
        </h3>
        <span className="text-[10px] font-medium text-slate-400">Composite</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative size-20 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="7"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={tone}
              strokeWidth="7"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold tabular-nums text-slate-800 dark:text-saas-text">
              {clamped}
            </span>
            <span className="text-[9px] font-medium text-slate-400">score</span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1">
          {breakdown.map((b) => (
            <li
              key={b.label}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="truncate text-slate-400">{b.label}</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-12 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, b.value)}%` }}
                  />
                </div>
                <span className="w-7 text-right font-semibold tabular-nums text-slate-700 dark:text-saas-text">
                  {b.value}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function NotificationCard({
  title,
  body,
  tone = 'info',
}: {
  title: string
  body: string
  tone?: 'success' | 'warn' | 'danger' | 'info' | 'accent'
}) {
  const styles = {
    success: 'border-l-emerald-500 bg-emerald-50/80',
    warn: 'border-l-amber-500 bg-amber-50/80',
    danger: 'border-l-red-500 bg-red-50/80',
    info: 'border-l-sky-500 bg-sky-50/80',
    accent: 'border-l-violet-500 bg-violet-50/80',
  }
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-100 border-l-4 p-2.5 shadow-sm dark:border-saas-border',
        styles[tone],
      )}
    >
      <p className="text-[11px] font-semibold text-slate-800 dark:text-saas-text">
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-saas-muted">
        {body}
      </p>
    </div>
  )
}
