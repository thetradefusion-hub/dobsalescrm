'use client'

import { Users } from 'lucide-react'
import { formatDealCurrencyShort } from '@/lib/currency'
import type { TeamPerformanceRow } from '@/lib/dashboard/types'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

interface TeamPerformanceProps {
  rows: TeamPerformanceRow[]
  loading?: boolean
}

export function TeamPerformance({ rows, loading }: TeamPerformanceProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-sm font-semibold text-wa-text">Team Performance</h2>
        <p className="mt-0.5 text-xs text-wa-muted/80">
          Open leads and wins by assignee
        </p>
      </header>

      <div className="flex-1 p-4 sm:p-5">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No assigned deals yet"
            hint="Assign deals in Pipelines or Leads to track team performance."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="border-b border-wa-border text-wa-muted">
                  <th className="pb-2 pr-3 font-medium">Member</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">Leads</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">Won</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">Revenue</th>
                  <th className="pb-2 font-medium tabular-nums">Conv. %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.userId ?? 'unassigned'}
                    className="border-b border-wa-border/60 last:border-0"
                  >
                    <td className="py-2.5 pr-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-wa-text">{row.name}</p>
                        <p className="truncate text-[10px] capitalize text-wa-muted">
                          {row.role}
                        </p>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-wa-text">{row.openLeads}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-wa-text">{row.wonDeals}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-wa-text">
                      {formatDealCurrencyShort(row.wonRevenue)}
                    </td>
                    <td className="py-2.5 tabular-nums text-wa-muted">
                      {row.conversionPct === null ? '—' : `${row.conversionPct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
