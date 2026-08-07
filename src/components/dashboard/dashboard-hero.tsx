'use client';

import Link from 'next/link';
import {
  CalendarClock,
  Filter,
  Plus,
  Search,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface HeroPulseStat {
  label: string;
  value: string;
  icon: LucideIcon;
  href: string;
  /** Highlights the pill when something needs attention. */
  alert?: boolean;
}

interface DashboardHeroProps {
  greeting: string;
  name: string;
  stats: HeroPulseStat[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onImport: () => void;
  onCreate: () => void;
}

function todayLabel() {
  return new Date().toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export function DashboardHero({
  greeting,
  name,
  stats,
  loading,
  search,
  onSearchChange,
  onSearchSubmit,
  filtersOpen,
  onToggleFilters,
  onImport,
  onCreate,
}: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#4338ca_0%,#6d28d9_45%,#7c3aed_100%)] p-4 shadow-[0_18px_40px_-20px_rgba(76,29,149,0.75)] sm:p-5">
      {/* Ambient glows + dotted texture */}
      <div
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-fuchsia-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-sky-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.18]"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium tracking-[0.14em] text-white/60 uppercase sm:text-[11px]">
              {todayLabel()}
            </p>
            <h1 className="mt-1 truncate text-lg font-bold tracking-tight text-white sm:text-xl md:text-2xl">
              {greeting}, {name}
            </h1>
            <p className="mt-0.5 hidden text-xs text-white/70 sm:block">
              Here is how your pipeline is moving right now.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/tasks?filter=due_today"
              aria-label="Reminders"
              className="inline-flex size-9 items-center justify-center gap-1.5 rounded-lg bg-white/12 text-[11px] font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 sm:h-9 sm:w-auto sm:px-3"
            >
              <CalendarClock className="size-3.5" />
              <span className="hidden sm:inline">Reminders</span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={onImport}
              aria-label="Import"
              className="size-9 rounded-lg border-white/25 bg-white/12 p-0 text-[11px] font-semibold text-white backdrop-blur hover:bg-white/20 hover:text-white sm:h-9 sm:w-auto sm:px-3"
            >
              <Upload className="size-3.5" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              size="sm"
              onClick={onCreate}
              className="h-9 rounded-lg bg-white px-2.5 text-[11px] font-bold text-violet-700 shadow-sm hover:bg-white/90 sm:px-3"
            >
              <Plus className="size-3.5" />
              <span className="sm:hidden">Lead</span>
              <span className="hidden sm:inline">New Lead</span>
            </Button>
          </div>
        </div>

        {/* Search + quick pulse */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-white/60" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSearchSubmit();
                }}
                placeholder="Search leads, contacts, deals…"
                className="h-9 rounded-full border-white/25 bg-white/12 pl-9 text-sm text-white shadow-none backdrop-blur placeholder:text-white/55 focus-visible:ring-white/50"
              />
            </div>
            <button
              type="button"
              onClick={onToggleFilters}
              aria-label="Filters"
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full ring-1 backdrop-blur transition',
                filtersOpen
                  ? 'bg-white text-violet-700 ring-white'
                  : 'bg-white/12 text-white ring-white/25 hover:bg-white/20'
              )}
            >
              <Filter className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:flex lg:shrink-0">
            {stats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className={cn(
                  'group flex items-center gap-2 rounded-xl px-2.5 py-1.5 ring-1 backdrop-blur transition',
                  stat.alert
                    ? 'bg-rose-500/25 ring-rose-200/40 hover:bg-rose-500/35'
                    : 'bg-white/12 ring-white/20 hover:bg-white/20'
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
                  <stat.icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-none font-bold text-white tabular-nums">
                    {loading ? '—' : stat.value}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] font-medium text-white/70">
                    {stat.label}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
