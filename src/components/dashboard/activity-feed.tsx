"use client"

import Link from 'next/link'
import { useState } from 'react'
import {
  MessageSquare,
  UserPlus,
  Briefcase,
  Radio,
  Zap,
  Inbox,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { ActivityItem, ActivityKind } from '@/lib/dashboard/types'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

interface ActivityFeedProps {
  items: ActivityItem[] | null
  loading: boolean
}

const PAGE_SIZES = [5, 10, 20, 50] as const
type PageSize = (typeof PAGE_SIZES)[number]

interface KindTheme {
  icon: ComponentType<{ className?: string }>
  /** Tailwind classes for the round icon badge + label color. */
  badge: string
}

const KIND_THEME: Record<ActivityKind, KindTheme & { label: string }> = {
  message: {
    icon: MessageSquare,
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    label: 'Message',
  },
  contact: {
    icon: UserPlus,
    badge: 'bg-wa-green/10 text-wa-green',
    label: 'Contact',
  },
  deal: {
    icon: Briefcase,
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    label: 'Deal',
  },
  broadcast: {
    icon: Radio,
    badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
    label: 'Broadcast',
  },
  automation: {
    icon: Zap,
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    label: 'Automation',
  },
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  // Start at 5 — a quick scan of the most recent events without
  // dominating vertical real estate. User expands explicitly via the
  // footer control when they want deeper history.
  const [pageSize, setPageSize] = useState<PageSize>(5)

  const totalLoaded = items?.length ?? 0
  const visible = items?.slice(0, pageSize) ?? []
  // A size option is "useful" if picking it would reveal rows the
  // smaller option doesn't already show. With PAGE_SIZES=[5,10,20,50]:
  // "10" is useful only once we've loaded ≥6 items, "20" once ≥11, etc.
  // The smallest option is always enabled.
  const isSizeUseful = (size: PageSize, i: number) =>
    i === 0 || totalLoaded > PAGE_SIZES[i - 1]

  return (
    <section className="overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="flex items-center justify-between border-b border-wa-border bg-wa-surface/30 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-wa-text">Recent Activity</h2>
          <p className="mt-0.5 text-xs text-wa-muted">Latest events across your CRM</p>
        </div>
        <Link
          href="/inbox"
          className="rounded-md px-2 py-1 text-xs font-medium text-wa-teal transition-colors hover:bg-wa-surface hover:text-wa-green"
        >
          View all →
        </Link>
      </header>

      {loading || !items ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={Inbox}
            title="No activity yet"
            hint="Activity from messages, deals, broadcasts, and automations will appear here."
          />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-wa-border">
            {visible.map((it, i) => {
              const theme = KIND_THEME[it.kind]
              const Icon = theme.icon
              // Alternating row background for scanability — dark-theme
              // translation of the spec's white / #f9fafb stripes.
              const stripe = i % 2 === 0 ? 'bg-transparent' : 'bg-wa-surface/40'
              const row = (
                <div className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ring-1 ring-black/5 dark:ring-white/5',
                      theme.badge,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="mb-0.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-wa-muted">
                      {theme.label}
                    </span>
                    <p className="truncate text-sm text-wa-text">{it.text}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-wa-muted tabular-nums">
                    {relativeTime(it.at)}
                  </span>
                </div>
              )
              return (
                <li
                  key={it.id}
                  className={cn(stripe, 'transition-colors hover:bg-wa-surface/60')}
                >
                  {it.href ? (
                    <Link href={it.href} className="block">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              )
            })}
          </ul>
          <footer className="flex items-center justify-between border-t border-wa-border px-5 py-3 text-xs">
            <span className="text-wa-muted/80 tabular-nums">
              Showing {visible.length} of {totalLoaded}
              {totalLoaded === 50 ? '+' : ''}
            </span>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-wa-muted/80">Show</span>
              {PAGE_SIZES.map((size, i) => {
                const disabled = !isSizeUseful(size, i)
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPageSize(size)}
                    disabled={disabled}
                    className={cn(
                      'rounded-md px-2 py-1 font-medium tabular-nums transition-colors',
                      pageSize === size
                        ? 'bg-wa-elevated text-wa-text'
                        : 'text-wa-muted hover:bg-wa-surface hover:text-wa-text',
                      disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-wa-muted',
                    )}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          </footer>
        </>
      )}
    </section>
  )
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 2_592_000) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
