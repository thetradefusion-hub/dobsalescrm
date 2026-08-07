'use client';

import Link from 'next/link';
import {
  CalendarClock,
  Flame,
  PhoneCall,
  PieChart,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDealCurrency } from '@/lib/currency';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import type {
  ActivityLeadRow,
  LeadSourceSlice,
  MonthPerformance,
} from '@/lib/dashboard/sales-activity';

function timeLabel(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dayLabel(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  });
}

const TEMP_TONE: Record<string, string> = {
  hot: 'bg-rose-50 text-rose-600 ring-rose-200/70',
  warm: 'bg-amber-50 text-amber-600 ring-amber-200/70',
  cold: 'bg-sky-50 text-sky-600 ring-sky-200/70',
};

function TemperatureChip({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-px text-[9px] font-bold tracking-wide uppercase ring-1 ring-inset',
        TEMP_TONE[value] ?? 'bg-slate-100 text-slate-500 ring-slate-200'
      )}
    >
      {value}
    </span>
  );
}

function PanelShell({
  title,
  count,
  icon: Icon,
  accent,
  action,
  children,
  className,
}: {
  title: string;
  count?: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('premium-panel flex flex-col overflow-hidden', className)}
    >
      <header className="dark:border-saas-border flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-current/15 ring-inset',
              accent
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <h3 className="dark:text-saas-text truncate text-[13px] font-semibold text-slate-800">
            {title}
          </h3>
          {typeof count === 'number' ? (
            <span className="dark:bg-saas-bg shrink-0 rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-bold text-slate-500 tabular-nums">
              {count}
            </span>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

function LeadActions({ row }: { row: ActivityLeadRow }) {
  const waHref = row.conversationId
    ? `/inbox?c=${row.conversationId}`
    : `/inbox`;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        href={waHref}
        aria-label={`WhatsApp ${row.contactName ?? row.title}`}
        title="Open WhatsApp chat"
        className="flex size-7 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50"
      >
        <WhatsAppIcon className="size-4" />
      </Link>
      {row.contactPhone ? (
        <a
          href={`tel:${row.contactPhone}`}
          aria-label={`Call ${row.contactName ?? row.title}`}
          title={`Call ${row.contactPhone}`}
          className="flex size-7 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50"
        >
          <PhoneCall className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}

/** Today's follow-ups with an upcoming tail — the rep's call list. */
export function FollowUpsPanel({
  today,
  upcoming,
  overdue,
  loading,
  className,
}: {
  today: ActivityLeadRow[];
  upcoming: ActivityLeadRow[];
  overdue: ActivityLeadRow[];
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn('premium-panel h-[300px] animate-pulse', className)} />
    );
  }

  const hasAny = today.length > 0 || overdue.length > 0 || upcoming.length > 0;

  return (
    <PanelShell
      title="Today's follow-ups"
      count={today.length}
      icon={CalendarClock}
      accent="bg-violet-50 text-violet-600"
      className={className}
      action={
        <Link
          href="/leads?filter=today"
          className="shrink-0 text-[11px] font-semibold text-sky-700 hover:underline"
        >
          View all
        </Link>
      }
    >
      {overdue.length > 0 ? (
        <Link
          href="/leads?filter=overdue"
          className="flex items-center justify-between gap-2 border-b border-rose-100 bg-rose-50/70 px-3 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          <span>
            {overdue.length} overdue follow-up{overdue.length === 1 ? '' : 's'}
          </span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      {!hasAny ? (
        <p className="flex-1 px-3 py-10 text-center text-xs text-slate-400">
          No follow-ups scheduled. Set a date on a lead to see it here.
        </p>
      ) : (
        <ul className="dark:divide-saas-border max-h-[248px] flex-1 divide-y divide-slate-100 overflow-y-auto">
          {[...today, ...upcoming].slice(0, 10).map((row) => {
            const isToday = today.includes(row);
            return (
              <li
                key={row.id}
                className="dark:hover:bg-saas-bg flex items-center gap-2.5 px-3 py-2 transition hover:bg-slate-50/80"
              >
                <span
                  className={cn(
                    'w-12 shrink-0 text-[11px] font-bold tabular-nums',
                    isToday ? 'text-violet-600' : 'text-slate-400'
                  )}
                >
                  {isToday
                    ? timeLabel(row.followUpAt)
                    : dayLabel(row.followUpAt)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="dark:text-saas-text truncate text-xs font-semibold text-slate-800">
                      {row.contactName ?? row.title}
                    </p>
                    <TemperatureChip value={row.temperature} />
                  </div>
                  <p className="truncate text-[10px] text-slate-400">
                    {row.company ?? row.stageName ?? row.title}
                  </p>
                </div>
                <LeadActions row={row} />
              </li>
            );
          })}
        </ul>
      )}
    </PanelShell>
  );
}

/** Highest AI lead scores — who to chase first. */
export function HotClientsPanel({
  rows,
  loading,
  className,
}: {
  rows: ActivityLeadRow[];
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn('premium-panel h-[300px] animate-pulse', className)} />
    );
  }

  return (
    <PanelShell
      title="Hot clients"
      icon={Flame}
      accent="bg-rose-50 text-rose-600"
      className={className}
      action={
        <Link
          href="/leads?filter=hot"
          className="shrink-0 text-[11px] font-semibold text-sky-700 hover:underline"
        >
          View all
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="flex-1 px-3 py-10 text-center text-xs text-slate-400">
          No scored leads yet. AI qualification fills this automatically.
        </p>
      ) : (
        <ul className="dark:divide-saas-border flex-1 divide-y divide-slate-100">
          {rows.map((row) => (
            <li
              key={row.id}
              className="dark:hover:bg-saas-bg flex items-center gap-2.5 px-3 py-2 transition hover:bg-slate-50/80"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 text-white">
                <Flame className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="dark:text-saas-text truncate text-xs font-semibold text-slate-800">
                  {row.contactName ?? row.title}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {row.company ??
                    row.stageName ??
                    formatDealCurrency(row.value)}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 tabular-nums">
                {row.score ?? '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

/** Where leads actually come from — uses the real deals.source column. */
export function LeadSourcesPanel({
  slices,
  totalCount,
  loading,
  className,
}: {
  slices: LeadSourceSlice[];
  totalCount: number;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn('premium-panel h-[300px] animate-pulse', className)} />
    );
  }

  const top = slices.slice(0, 5);

  return (
    <PanelShell
      title="Top lead sources"
      icon={PieChart}
      accent="bg-sky-50 text-sky-600"
      className={className}
      action={
        <span className="shrink-0 text-[11px] font-semibold text-slate-400 tabular-nums">
          {totalCount} leads
        </span>
      }
    >
      {top.length === 0 ? (
        <p className="flex-1 px-3 py-10 text-center text-xs text-slate-400">
          No sources recorded yet. Pick a source when creating a lead.
        </p>
      ) : (
        <ul className="flex-1 space-y-2.5 px-3 py-3">
          {top.map((slice) => (
            <li key={slice.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden
                  />
                  <span className="dark:text-saas-text truncate font-medium text-slate-600">
                    {slice.label}
                  </span>
                </span>
                <span className="dark:text-saas-text shrink-0 font-bold text-slate-800 tabular-nums">
                  {slice.pct}%
                </span>
              </div>
              <div className="dark:bg-saas-bg h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max(slice.pct, 2)}%`,
                    backgroundColor: slice.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

/** Month-to-date outcome donut — replaces the target gauge in the mock. */
export function PerformancePanel({
  performance,
  loading,
  className,
}: {
  performance: MonthPerformance | null;
  loading?: boolean;
  className?: string;
}) {
  if (loading || !performance) {
    return (
      <div className={cn('premium-panel h-[300px] animate-pulse', className)} />
    );
  }

  const pct = performance.closeRate ?? 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  const legend = [
    {
      label: 'New leads',
      value: performance.newLeads,
      color: '#7c3aed',
    },
    {
      label: 'Qualified',
      value: performance.qualified,
      color: '#0ea5e9',
    },
    { label: 'Won', value: performance.won, color: '#10b981' },
    { label: 'Lost', value: performance.lost, color: '#f43f5e' },
  ];

  return (
    <PanelShell
      title="My performance"
      icon={Target}
      accent="bg-emerald-50 text-emerald-600"
      className={className}
      action={
        <Link
          href="/reports"
          className="shrink-0 text-[11px] font-semibold text-sky-700 hover:underline"
        >
          Report
        </Link>
      }
    >
      <div className="flex flex-1 items-center gap-3 px-3 py-3">
        <div className="relative size-[92px] shrink-0">
          <svg viewBox="0 0 88 88" className="size-full -rotate-90">
            <circle
              cx="44"
              cy="44"
              r={r}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="9"
            />
            <circle
              cx="44"
              cy="44"
              r={r}
              fill="none"
              stroke="url(#perf-grad)"
              strokeWidth="9"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
            <defs>
              <linearGradient id="perf-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="dark:text-saas-text text-lg leading-none font-bold text-slate-900 tabular-nums">
              {performance.closeRate === null ? '—' : `${pct}%`}
            </span>
            <span className="mt-0.5 text-[9px] font-medium text-slate-400">
              Win rate
            </span>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-1.5">
          {legend.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="truncate text-slate-500">{item.label}</span>
              </span>
              <span className="dark:text-saas-text shrink-0 font-bold text-slate-800 tabular-nums">
                {item.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="dark:border-saas-border flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
          <TrendingUp className="size-3 text-emerald-500" />
          Revenue closed
        </span>
        <span className="dark:text-saas-text text-xs font-bold text-slate-900 tabular-nums">
          {formatDealCurrency(performance.wonRevenue)}
        </span>
      </div>
    </PanelShell>
  );
}
