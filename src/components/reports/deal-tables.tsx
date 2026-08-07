'use client'

import Link from 'next/link'
import { CircleCheckBig, Trophy } from 'lucide-react'
import type { ReportDealRow } from '@/lib/reports/types'
import { formatDealCurrency } from '@/lib/currency'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'won'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/70'
      : status === 'lost'
        ? 'bg-rose-50 text-rose-600 ring-rose-200/70'
        : 'bg-sky-50 text-sky-600 ring-sky-200/70'
  return (
    <span
      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset ${tone}`}
    >
      {status}
    </span>
  )
}

function TempBadge({ temp }: { temp: string | null }) {
  if (!temp) return <span className="text-slate-300">—</span>
  const tone =
    temp === 'hot'
      ? 'bg-rose-50 text-rose-600'
      : temp === 'warm'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-sky-50 text-sky-600'
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize ${tone}`}
    >
      {temp}
    </span>
  )
}

function DealTable({
  rows,
  showClosedDate,
}: {
  rows: ReportDealRow[]
  showClosedDate?: boolean
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-[11px] text-slate-400">
        No deals in this range.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-100 hover:bg-transparent dark:border-saas-border">
            <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Deal
            </TableHead>
            <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Contact
            </TableHead>
            <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Priority
            </TableHead>
            <TableHead className="h-8 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Value
            </TableHead>
            <TableHead className="h-8 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Status
            </TableHead>
            <TableHead className="hidden h-8 text-[10px] font-semibold uppercase tracking-wide text-slate-400 2xl:table-cell">
              {showClosedDate ? 'Closed' : 'Created'}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="border-slate-100 transition hover:bg-slate-50/70 dark:border-saas-border dark:hover:bg-saas-bg"
            >
              <TableCell className="py-2">
                <Link
                  href="/leads"
                  className="text-xs font-semibold text-slate-800 transition hover:text-violet-600 dark:text-saas-text"
                >
                  {row.title}
                </Link>
                {row.stage_name ? (
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: row.stage_color ?? '#64748b' }}
                    />
                    {row.stage_name}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="py-2 text-xs text-slate-500">
                {row.contact_name ?? '—'}
              </TableCell>
              <TableCell className="py-2">
                <TempBadge temp={row.lead_temperature} />
              </TableCell>
              <TableCell className="py-2 text-right text-xs font-bold tabular-nums text-slate-800 dark:text-saas-text">
                {formatDealCurrency(row.value, row.currency ?? undefined)}
              </TableCell>
              <TableCell className="py-2">
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="hidden py-2 text-[11px] tabular-nums text-slate-400 2xl:table-cell">
                {new Date(
                  showClosedDate ? row.updated_at : row.created_at,
                ).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TableShell({
  title,
  subtitle,
  icon: Icon,
  accent,
  href,
  linkLabel,
  children,
}: {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  href: string
  linkLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="premium-panel flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 dark:border-saas-border">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-current/15 ${accent}`}
          >
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold text-slate-800 dark:text-saas-text">
              {title}
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-violet-600 transition hover:bg-violet-50"
        >
          {linkLabel}
        </Link>
      </header>
      <div className="flex-1 p-1.5 sm:p-2.5">{children}</div>
    </section>
  )
}

export function TopDealsTable({ rows }: { rows: ReportDealRow[] }) {
  return (
    <TableShell
      title="Top New Leads"
      subtitle="Highest value leads created in range"
      icon={Trophy}
      accent="bg-amber-50 text-amber-600"
      href="/leads"
      linkLabel="View leads"
    >
      <DealTable rows={rows} />
    </TableShell>
  )
}

export function RecentClosedTable({ rows }: { rows: ReportDealRow[] }) {
  return (
    <TableShell
      title="Recently Closed"
      subtitle="Won and lost outcomes in this period"
      icon={CircleCheckBig}
      accent="bg-emerald-50 text-emerald-600"
      href="/pipelines"
      linkLabel="Pipelines"
    >
      <DealTable rows={rows} showClosedDate />
    </TableShell>
  )
}
