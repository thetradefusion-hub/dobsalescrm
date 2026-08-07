'use client'

import Link from 'next/link'
import {
  Calendar,
  CheckSquare,
  Phone,
  Sparkles,
} from 'lucide-react'
import { SectionHeader, StatBadge } from '@/components/enterprise/section-header'
import type {
  ActivityItem,
  DashboardLeadRow,
  SalesInsight,
  ScheduleItem,
  TeamPerformanceRow,
} from '@/lib/dashboard/types'
import { formatDealCurrency } from '@/lib/currency'
import { NotificationCard } from '@/components/enterprise/whatsapp-stats'
import { cn } from '@/lib/utils'

export function ScheduleTimeline({
  items,
  loading,
}: {
  items: ScheduleItem[]
  loading?: boolean
}) {
  if (loading) return <div className="h-56 animate-pulse rounded-2xl bg-white" />

  return (
    <div className="h-full premium-panel p-3">
      <SectionHeader
        title="Today's Schedule"
        description="Follow-ups & tasks"
        action={
          <Link href="/tasks" className="text-xs font-semibold text-sky-700 hover:underline">
            View all
          </Link>
        }
      />
      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-saas-muted">
          Nothing scheduled for today
        </p>
      ) : (
        <ul className="max-h-56 space-y-0 overflow-y-auto">
          {items.map((item, i) => {
            const Icon =
              item.kind === 'call'
                ? Phone
                : item.kind === 'task'
                  ? CheckSquare
                  : Calendar
            return (
              <li key={item.id} className="relative flex gap-2.5 pb-3 last:pb-0">
                {i < items.length - 1 ? (
                  <span className="absolute left-[13px] top-7 bottom-0 w-px bg-saas-border" />
                ) : null}
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-saas-border bg-saas-bg text-saas-accent">
                  <Icon className="size-3" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-saas-text">
                      {item.title}
                    </p>
                    <span className="shrink-0 text-[10px] tabular-nums text-saas-muted">
                      {item.timeLabel}
                    </span>
                  </div>
                  {item.subtitle ? (
                    <p className="truncate text-[11px] text-saas-muted">
                      {item.subtitle}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function AiWidget({
  insights,
  loading,
}: {
  insights: SalesInsight[]
  loading?: boolean
}) {
  if (loading) return <div className="h-56 animate-pulse rounded-2xl bg-white" />

  return (
    <div className="flex h-full flex-col premium-panel p-3">
      <SectionHeader
        title="AI Insights"
        description="Pipeline signals"
        action={<StatBadge tone="accent">AI</StatBadge>}
      />
      <ul className="flex-1 space-y-1.5">
        {insights.slice(0, 4).map((ins) => (
          <li key={ins.id}>
            {ins.href ? (
              <Link href={ins.href} className="block">
                <NotificationCard
                  title={
                    ins.severity === 'urgent'
                      ? 'Urgent'
                      : ins.severity === 'warn'
                        ? 'Attention'
                        : 'Tip'
                  }
                  body={ins.text}
                  tone={
                    ins.severity === 'urgent'
                      ? 'danger'
                      : ins.severity === 'warn'
                        ? 'warn'
                        : 'accent'
                  }
                />
              </Link>
            ) : (
              <NotificationCard
                title="Insight"
                body={ins.text}
                tone="info"
              />
            )}
          </li>
        ))}
      </ul>
      <Link
        href="/settings?tab=ai"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-3 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-600/25 transition hover:brightness-110"
      >
        <Sparkles className="size-3.5" />
        Ask AI Assistant
      </Link>
    </div>
  )
}

export function RecentDeals({
  rows,
  loading,
}: {
  rows: DashboardLeadRow[]
  loading?: boolean
}) {
  if (loading) return <div className="h-56 animate-pulse rounded-2xl bg-white" />

  return (
    <div className="premium-panel p-3">
      <SectionHeader
        title="Recent Deals"
        description="Open pipeline"
        action={
          <Link href="/leads" className="text-xs font-semibold text-violet-600 hover:underline">
            All leads
          </Link>
        }
      />
      {rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-saas-muted">No open deals</p>
      ) : (
        <ul className="divide-y divide-saas-border">
          {rows.slice(0, 5).map((row) => {
            const initial = (row.contact_name ?? row.title).charAt(0).toUpperCase()
            return (
              <li key={row.id} className="flex items-center gap-3 py-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-saas-accent-soft text-xs font-bold text-saas-accent">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-saas-text">
                    {row.contact_name ?? row.title}
                  </p>
                  <p className="truncate text-[10px] text-saas-muted">
                    {row.stage_name ?? '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold tabular-nums text-saas-text">
                    {formatDealCurrency(row.value)}
                  </p>
                  {row.lead_temperature ? (
                    <StatBadge
                      tone={
                        row.lead_temperature === 'hot'
                          ? 'danger'
                          : row.lead_temperature === 'warm'
                            ? 'warn'
                            : 'neutral'
                      }
                    >
                      {row.lead_temperature}
                    </StatBadge>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function Leaderboard({
  rows,
  loading,
}: {
  rows: TeamPerformanceRow[]
  loading?: boolean
}) {
  if (loading) return <div className="h-56 animate-pulse rounded-2xl bg-white" />

  return (
    <div className="premium-panel p-3">
      <SectionHeader title="Team Leaderboard" description="Top performers" />
      {rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-saas-muted">No team data yet</p>
      ) : (
        <ol className="space-y-2">
          {rows.slice(0, 5).map((row, i) => (
            <li
              key={row.userId ?? row.name}
              className="flex items-center gap-3 rounded-[10px] border border-saas-border/80 bg-saas-bg/40 px-2.5 py-2"
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[10px] font-bold',
                  i === 0
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-saas-card text-saas-muted',
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-saas-text">
                  {row.name}
                </p>
                <p className="text-[10px] text-saas-muted">
                  {row.wonDeals} won · {row.openLeads} open
                </p>
              </div>
              <p className="text-xs font-bold tabular-nums text-saas-text">
                {formatDealCurrency(row.wonRevenue)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function ActivityTimeline({
  items,
  loading,
}: {
  items: ActivityItem[]
  loading?: boolean
}) {
  if (loading) return <div className="h-48 animate-pulse rounded-2xl bg-white" />

  return (
    <div className="premium-panel p-3">
      <SectionHeader title="Recent Activity" description="Live feed" />
      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-saas-muted">No recent activity</p>
      ) : (
        <ul className="max-h-56 space-y-3 overflow-y-auto">
          {items.slice(0, 8).map((item) => (
            <li key={item.id} className="flex gap-2 text-xs">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-saas-accent" />
              <div className="min-w-0 flex-1">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="font-medium text-saas-text hover:text-saas-accent"
                  >
                    {item.text}
                  </Link>
                ) : (
                  <p className="font-medium text-saas-text">{item.text}</p>
                )}
                <p className="text-[10px] text-saas-muted">
                  {new Date(item.at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SmartNotifications({
  insights,
  overdueCount,
  hotCount,
}: {
  insights: SalesInsight[]
  overdueCount: number
  hotCount: number
}) {
  const cards: { title: string; body: string; tone: 'success' | 'warn' | 'danger' | 'info' }[] = []

  if (hotCount > 0) {
    cards.push({
      title: 'Hot leads',
      body: `${hotCount} hot lead${hotCount === 1 ? '' : 's'} need attention.`,
      tone: 'danger',
    })
  }
  if (overdueCount > 0) {
    cards.push({
      title: 'Follow-ups missed',
      body: `${overdueCount} follow-up${overdueCount === 1 ? '' : 's'} overdue.`,
      tone: 'warn',
    })
  }
  for (const ins of insights.slice(0, 2)) {
    if (cards.length >= 3) break
    cards.push({
      title: ins.severity === 'info' ? 'Update' : 'Alert',
      body: ins.text,
      tone:
        ins.severity === 'urgent'
          ? 'danger'
          : ins.severity === 'warn'
            ? 'warn'
            : 'success',
    })
  }
  if (cards.length === 0) {
    cards.push({
      title: 'All clear',
      body: 'No urgent notifications right now.',
      tone: 'success',
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-saas-muted">
        Smart Notifications
      </p>
      {cards.map((c, i) => (
        <NotificationCard key={`${c.title}-${i}`} {...c} />
      ))}
    </div>
  )
}
