'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Flame,
  CalendarClock,
  AlertTriangle,
  Phone,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDealCurrency } from '@/lib/currency'
import { stagePastel } from '@/components/leads/pipeline-chevron'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'
import type { DashboardLeadRow } from '@/lib/dashboard/types'

function waLink(phone?: string | null) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return null
  return `https://wa.me/${digits}`
}

function PriorityLeadRow({ lead }: { lead: DashboardLeadRow }) {
  const whatsapp = waLink(lead.contact_phone)
  const followLabel = lead.follow_up_at
    ? new Date(lead.follow_up_at).toLocaleString([], {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="grid gap-1.5 border-t border-slate-100 bg-white px-3 py-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6.5rem] sm:items-center dark:border-saas-border dark:bg-saas-card">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold text-slate-900 dark:text-saas-text">
          {lead.contact_name ?? lead.title}
        </p>
        <p className="truncate text-[10px] text-slate-500">
          {lead.stage_name ?? 'Lead'}
          {lead.contact_phone ? ` · ${lead.contact_phone}` : ''}
        </p>
        {followLabel ? (
          <p className="mt-0.5 text-[10px] font-semibold text-amber-600">
            Follow-up: {followLabel}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-800 dark:text-saas-text">
          {formatDealCurrency(lead.value)}
        </p>
        {lead.lead_temperature ? (
          <span
            className={cn(
              'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
              lead.lead_temperature === 'hot' &&
                'bg-rose-50 text-rose-700',
              lead.lead_temperature === 'warm' &&
                'bg-amber-50 text-amber-700',
              lead.lead_temperature === 'cold' &&
                'bg-slate-100 text-slate-600',
            )}
          >
            {lead.lead_temperature}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-1.5">
        {lead.contact_phone ? (
          <a
            href={`tel:${lead.contact_phone}`}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600"
            aria-label="Call"
          >
            <Phone className="size-3.5" />
          </a>
        ) : null}
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            aria-label="WhatsApp"
          >
            <WhatsAppIcon className="size-3.5" />
          </a>
        ) : null}
        <Link
          href="/leads"
          className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-sky-500"
        >
          Open
        </Link>
      </div>
    </div>
  )
}

function PriorityAccordion({
  title,
  count,
  color,
  icon: Icon,
  href,
  leads,
  defaultOpen,
  emptyHint,
}: {
  title: string
  count: number
  color: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  leads: DashboardLeadRow[]
  defaultOpen?: boolean
  emptyHint: string
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen && count > 0))
  const bg = stagePastel(color, 0.14)

  return (
    <section
      className="overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_28px_-22px_rgba(15,23,42,0.35)]"
      style={{ borderColor: `${color}55`, backgroundColor: bg }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:brightness-[0.98]"
      >
        <span
          className="flex size-7 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: color }}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="flex-1 text-[13px] font-bold text-slate-800 dark:text-saas-text">
          {title}{' '}
          <span className="font-semibold text-slate-500">({count})</span>
        </span>
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="mr-2 text-[11px] font-semibold text-sky-700 hover:underline"
        >
          View all
        </Link>
        <ChevronDown
          className={cn(
            'size-4 text-slate-500 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-black/5 bg-white/60 dark:bg-saas-card/80">
          {leads.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400">
              {emptyHint}
            </p>
          ) : (
            leads.map((lead) => <PriorityLeadRow key={lead.id} lead={lead} />)
          )}
        </div>
      ) : null}
    </section>
  )
}

export function DashboardPriorityBoard({
  hotLeads,
  todayFollowUps,
  overdueFollowUps,
  loading,
}: {
  hotLeads: DashboardLeadRow[]
  todayFollowUps: DashboardLeadRow[]
  overdueFollowUps: DashboardLeadRow[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-white shadow-sm"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <PriorityAccordion
        title="Hot Lead"
        count={hotLeads.length}
        color="#ef4444"
        icon={Flame}
        href="/leads?filter=hot"
        leads={hotLeads.slice(0, 8)}
        defaultOpen
        emptyHint="No hot leads right now."
      />
      <PriorityAccordion
        title="Followup"
        count={todayFollowUps.length}
        color="#2563eb"
        icon={CalendarClock}
        href="/tasks?filter=due_today"
        leads={todayFollowUps.slice(0, 8)}
        defaultOpen={todayFollowUps.length > 0}
        emptyHint="No follow-ups scheduled for today."
      />
      <PriorityAccordion
        title="Overdue"
        count={overdueFollowUps.length}
        color="#f97316"
        icon={AlertTriangle}
        href="/leads?filter=overdue"
        leads={overdueFollowUps.slice(0, 8)}
        defaultOpen={overdueFollowUps.length > 0}
        emptyHint="No overdue follow-ups."
      />
    </div>
  )
}
