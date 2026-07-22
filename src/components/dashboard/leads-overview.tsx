'use client'

import Link from 'next/link'
import { Flame, Clock3, ArrowRight, Loader2 } from 'lucide-react'
import type { LeadStatsLike, DashboardLeadRow } from '@/lib/dashboard/types'
import { LeadPriorityBadge } from '@/components/leads/lead-priority-badge'
import { formatDealCurrency } from '@/lib/currency'
import { formatFollowUp } from '@/lib/leads/format-follow-up'
import { cn } from '@/lib/utils'

interface LeadsOverviewProps {
  stats: LeadStatsLike | null
  hotLeads: DashboardLeadRow[]
  overdueLeads: DashboardLeadRow[]
  loading: boolean
}

export function LeadsOverview({
  stats,
  hotLeads,
  overdueLeads,
  loading,
}: LeadsOverviewProps) {
  return (
    <section className="w-full">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-wa-text">Leads</h2>
          <p className="mt-0.5 text-xs text-wa-muted">
            Pipeline opportunities synced with contacts
          </p>
        </div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-xs font-medium text-wa-green hover:underline"
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        {/* Stat chips */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:col-span-5 lg:grid-cols-2">
          <LeadStatChip
            label="Open leads"
            value={stats?.total ?? 0}
            loading={loading}
            href="/leads"
          />
          <LeadStatChip
            label="Hot"
            value={stats?.hot ?? 0}
            loading={loading}
            href="/leads?filter=hot"
            tone="hot"
            icon={<Flame className="size-3.5" />}
          />
          <LeadStatChip
            label="Overdue"
            value={stats?.overdueFollowUps ?? 0}
            loading={loading}
            href="/leads?filter=overdue"
            tone="overdue"
            icon={<Clock3 className="size-3.5" />}
          />
          <LeadStatChip
            label="Pipeline value"
            value={
              loading
                ? '…'
                : formatDealCurrency(stats?.pipelineValue ?? 0)
            }
            loading={loading}
            href="/leads"
            isCurrency
          />
        </div>

        {/* Hot + overdue lists */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
          <LeadMiniList
            title="Hot leads"
            empty="No hot leads right now"
            loading={loading}
            rows={hotLeads}
            href="/leads"
          />
          <LeadMiniList
            title="Overdue follow-ups"
            empty="Nothing overdue"
            loading={loading}
            rows={overdueLeads}
            href="/leads"
            emphasizeFollowUp
          />
        </div>
      </div>
    </section>
  )
}

function LeadStatChip({
  label,
  value,
  loading,
  href,
  tone,
  icon,
  isCurrency,
}: {
  label: string
  value: number | string
  loading: boolean
  href: string
  tone?: 'hot' | 'overdue'
  icon?: React.ReactNode
  isCurrency?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-xl border border-wa-border bg-wa-panel px-3 py-2.5 transition-colors hover:border-wa-green/30 hover:bg-wa-surface/40',
        tone === 'hot' && 'border-red-500/20',
        tone === 'overdue' && 'border-amber-500/20',
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-wa-muted">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          'mt-1 text-xl font-bold tabular-nums text-wa-text',
          tone === 'hot' && 'text-red-400',
          tone === 'overdue' && 'text-amber-400',
          isCurrency && 'text-base sm:text-lg',
        )}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin text-wa-muted" />
        ) : typeof value === 'number' ? (
          value.toLocaleString()
        ) : (
          value
        )}
      </p>
    </Link>
  )
}

function LeadMiniList({
  title,
  empty,
  loading,
  rows,
  href,
  emphasizeFollowUp,
}: {
  title: string
  empty: string
  loading: boolean
  rows: DashboardLeadRow[]
  href: string
  emphasizeFollowUp?: boolean
}) {
  return (
    <div className="rounded-xl border border-wa-border bg-wa-panel">
      <div className="flex items-center justify-between border-b border-wa-border px-3 py-2">
        <p className="text-xs font-semibold text-wa-text">{title}</p>
        <Link href={href} className="text-[10px] text-wa-green hover:underline">
          Open
        </Link>
      </div>
      <div className="divide-y divide-wa-border/60">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-wa-green" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-wa-muted">{empty}</p>
        ) : (
          rows.slice(0, 4).map((row) => {
            const followUp = formatFollowUp(row.follow_up_at)
            return (
              <Link
                key={row.id}
                href="/leads"
                className="flex items-start justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-wa-surface/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-wa-text">
                    {row.title}
                  </p>
                  <p className="truncate text-[11px] text-wa-muted">
                    {row.contact_name ?? 'Unknown'}
                    {row.contact_phone ? ` · ${row.contact_phone}` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <LeadPriorityBadge temperature={row.lead_temperature} />
                    {row.stage_name ? (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${row.stage_color ?? '#64748b'}22`,
                          color: row.stage_color ?? '#64748b',
                        }}
                      >
                        {row.stage_name}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold tabular-nums text-wa-text">
                    {formatDealCurrency(row.value, row.currency ?? undefined)}
                  </p>
                  {emphasizeFollowUp || row.follow_up_at ? (
                    <p
                      className={cn(
                        'mt-0.5 text-[10px]',
                        followUp.tone === 'overdue'
                          ? 'text-red-400'
                          : followUp.tone === 'soon'
                            ? 'text-amber-400'
                            : 'text-wa-muted',
                      )}
                    >
                      {followUp.label}
                    </p>
                  ) : null}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
