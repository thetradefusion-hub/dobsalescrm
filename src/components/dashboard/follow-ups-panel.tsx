'use client'

import Link from 'next/link'
import { Bell, CalendarClock } from 'lucide-react'
import type { DashboardLeadRow } from '@/lib/dashboard/types'
import { formatFollowUp } from '@/lib/leads/format-follow-up'
import { formatDealCurrencyShort } from '@/lib/currency'
import { Skeleton } from './skeleton'
import { cn } from '@/lib/utils'

interface FollowUpsPanelProps {
  today: DashboardLeadRow[]
  overdue: DashboardLeadRow[]
  loading?: boolean
}

export function FollowUpsPanel({ today, overdue, loading }: FollowUpsPanelProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="flex items-start justify-between gap-3 border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <h2 className="text-sm font-semibold text-wa-text">Follow-ups</h2>
          <p className="mt-0.5 text-xs text-wa-muted/80">Today and overdue open leads</p>
        </div>
        <Link href="/leads?filter=overdue" className="text-xs font-medium text-wa-teal hover:underline">
          View all
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-4 sm:p-5">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <FollowUpGroup
              title="Today's Follow-ups"
              icon={CalendarClock}
              items={today}
              empty="Nothing due today"
              tone="soon"
            />
            <FollowUpGroup
              title="Overdue Follow-ups"
              icon={Bell}
              items={overdue}
              empty="No overdue follow-ups"
              tone="overdue"
            />
          </>
        )}
      </div>
    </section>
  )
}

function FollowUpGroup({
  title,
  icon: Icon,
  items,
  empty,
  tone,
}: {
  title: string
  icon: typeof Bell
  items: DashboardLeadRow[]
  empty: string
  tone: 'soon' | 'overdue'
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            tone === 'overdue' ? 'text-red-500' : 'text-wa-teal',
          )}
          aria-hidden
        />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-wa-muted">
          {title}
        </h3>
        {items.length > 0 && (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
              tone === 'overdue'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : 'bg-wa-teal/10 text-wa-teal',
            )}
          >
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-wa-border px-3 py-4 text-center text-xs text-wa-muted">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => {
            const fu = formatFollowUp(row.follow_up_at)
            return (
              <li key={row.id}>
                <Link
                  href={`/leads`}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border border-wa-border/80 bg-wa-surface/40 px-3 py-2.5 transition-colors hover:border-wa-green/30 hover:bg-wa-surface',
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: row.stage_color || '#64748b' }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-wa-text">
                      {row.contact_name || row.title}
                    </p>
                    <p className="truncate text-[11px] text-wa-muted">
                      {row.stage_name || 'Lead'}
                      {row.value > 0 ? ` · ${formatDealCurrencyShort(row.value)}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-[10px] font-semibold',
                      fu.tone === 'overdue'
                        ? 'text-red-500'
                        : fu.tone === 'soon'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-wa-muted',
                    )}
                  >
                    {fu.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
