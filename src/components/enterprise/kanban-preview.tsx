'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDealCurrency } from '@/lib/currency';
import {
  SectionHeader,
  StatBadge,
} from '@/components/enterprise/section-header';
import { stagePastel } from '@/components/leads/pipeline-chevron';
import type { KanbanColumn, KanbanDealCard } from '@/lib/dashboard/types';

function followUpLabel(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function LeadMiniCard({ card }: { card: KanbanDealCard }) {
  const followUp = followUpLabel(card.followUpAt);
  const overdue =
    !!card.followUpAt && new Date(card.followUpAt).getTime() < Date.now();

  return (
    <Link
      href="/leads"
      className={cn(
        'block rounded-xl border border-slate-100 bg-white p-2 shadow-sm',
        'dark:border-saas-border dark:bg-saas-card transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md'
      )}
    >
      <p className="dark:text-saas-text truncate text-[11px] font-bold text-slate-800">
        {card.contactName ?? card.title}
      </p>
      <p className="truncate text-[10px] text-slate-400">
        {card.company ?? formatDealCurrency(card.value)}
      </p>
      <p className="dark:text-saas-muted mt-0.5 truncate text-[10px] text-slate-500">
        {card.title}
      </p>

      <div className="mt-1.5 flex items-center justify-between gap-1">
        {card.priority ? (
          <StatBadge
            tone={
              card.priority === 'hot'
                ? 'danger'
                : card.priority === 'warm'
                  ? 'warn'
                  : 'info'
            }
          >
            {card.priority}
          </StatBadge>
        ) : (
          <span />
        )}
        <span className="dark:text-saas-text text-[10px] font-bold text-slate-700 tabular-nums">
          {formatDealCurrency(card.value)}
        </span>
      </div>

      {followUp ? (
        <div className="dark:border-saas-border mt-1.5 flex items-center gap-1 border-t border-dashed border-slate-200 pt-1.5">
          <CalendarClock
            className={cn(
              'size-3 shrink-0',
              overdue ? 'text-rose-500' : 'text-slate-400'
            )}
          />
          <span className="truncate text-[9px] text-slate-400">
            Next follow up
          </span>
          <span
            className={cn(
              'ml-auto shrink-0 text-[9px] font-semibold tabular-nums',
              overdue ? 'text-rose-600' : 'dark:text-saas-text text-slate-600'
            )}
          >
            {followUp}
          </span>
        </div>
      ) : null}
    </Link>
  );
}

export function KanbanPreview({
  columns,
  totalValue,
  totalDeals,
  loading,
}: {
  columns: KanbanColumn[];
  totalValue: number;
  totalDeals: number;
  loading?: boolean;
}) {
  if (loading) {
    return <div className="saas-card h-64 animate-pulse" />;
  }

  return (
    <div className="premium-panel overflow-hidden p-3">
      <SectionHeader
        title="Sales Pipeline"
        description={`Total ${formatDealCurrency(totalValue)} · ${totalDeals} deals`}
        action={
          <Link
            href="/pipelines"
            className="text-xs font-semibold text-sky-700 hover:underline"
          >
            Open board
          </Link>
        }
      />
      <div className="-mx-1 flex gap-2.5 overflow-x-auto pt-0.5 pb-1">
        {columns.map((col) => (
          <div
            key={col.id}
            className="w-[156px] shrink-0 rounded-xl border p-1.5"
            style={{
              backgroundColor: stagePastel(col.color, 0.14),
              borderColor: `${col.color || '#94a3b8'}40`,
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-1 px-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: col.color || '#94a3b8' }}
                />
                <span className="text-saas-text truncate text-[11px] font-semibold">
                  {col.name}
                </span>
              </div>
              <span className="text-saas-muted text-[10px] tabular-nums">
                {col.count}
              </span>
            </div>
            <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
              {col.cards.length === 0 ? (
                <p className="text-saas-muted px-1 py-4 text-center text-[10px]">
                  Empty
                </p>
              ) : (
                <>
                  {col.cards.map((c) => (
                    <LeadMiniCard key={c.id} card={c} />
                  ))}
                  {col.count > col.cards.length ? (
                    <Link
                      href="/leads"
                      className="dark:bg-saas-card/70 rounded-lg bg-white/70 py-1.5 text-center text-[10px] font-semibold text-slate-500 transition hover:bg-white hover:text-violet-700"
                    >
                      + {col.count - col.cards.length} more leads
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
