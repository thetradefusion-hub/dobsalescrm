'use client'

import Link from 'next/link'
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
import { Badge } from '@/components/ui/badge'

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'won'
      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
      : status === 'lost'
        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  return (
    <Badge variant="outline" className={`border-0 text-[10px] capitalize ${tone}`}>
      {status}
    </Badge>
  )
}

function TempBadge({ temp }: { temp: string | null }) {
  if (!temp) return <span className="text-wa-muted">—</span>
  const tone =
    temp === 'hot'
      ? 'text-red-500'
      : temp === 'warm'
        ? 'text-orange-500'
        : 'text-blue-500'
  return <span className={`text-xs capitalize ${tone}`}>{temp}</span>
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
      <p className="py-8 text-center text-sm text-wa-muted">No deals in this range.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-wa-border hover:bg-transparent">
            <TableHead className="text-wa-muted">Deal</TableHead>
            <TableHead className="text-wa-muted">Contact</TableHead>
            <TableHead className="text-wa-muted">Stage</TableHead>
            <TableHead className="text-wa-muted">Priority</TableHead>
            <TableHead className="text-right text-wa-muted">Value</TableHead>
            <TableHead className="text-wa-muted">Status</TableHead>
            <TableHead className="text-wa-muted">
              {showClosedDate ? 'Closed' : 'Created'}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="border-wa-border">
              <TableCell>
                <Link
                  href="/leads"
                  className="font-medium text-wa-text hover:text-wa-green"
                >
                  {row.title}
                </Link>
              </TableCell>
              <TableCell className="text-wa-muted">{row.contact_name ?? '—'}</TableCell>
              <TableCell>
                {row.stage_name ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: row.stage_color ?? '#64748b' }}
                    />
                    {row.stage_name}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <TempBadge temp={row.lead_temperature} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatDealCurrency(row.value, row.currency ?? undefined)}
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-xs text-wa-muted tabular-nums">
                {new Date(showClosedDate ? row.updated_at : row.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function TopDealsTable({ rows }: { rows: ReportDealRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="flex items-start justify-between gap-3 border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <h2 className="text-sm font-semibold text-wa-text">Top New Leads</h2>
          <p className="mt-0.5 text-xs text-wa-muted/80">
            Highest value leads created in range
          </p>
        </div>
        <Link
          href="/leads"
          className="shrink-0 text-xs font-medium text-wa-teal hover:underline"
        >
          View leads
        </Link>
      </header>
      <div className="p-2 sm:p-4">
        <DealTable rows={rows} />
      </div>
    </section>
  )
}

export function RecentClosedTable({ rows }: { rows: ReportDealRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="flex items-start justify-between gap-3 border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <h2 className="text-sm font-semibold text-wa-text">Recently Closed</h2>
          <p className="mt-0.5 text-xs text-wa-muted/80">
            Won & lost outcomes in this period
          </p>
        </div>
        <Link
          href="/pipelines"
          className="shrink-0 text-xs font-medium text-wa-teal hover:underline"
        >
          Pipelines
        </Link>
      </header>
      <div className="p-2 sm:p-4">
        <DealTable rows={rows} showClosedDate />
      </div>
    </section>
  )
}
