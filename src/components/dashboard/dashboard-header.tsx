'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Inbox, RefreshCw, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useIsDesktopLayout } from '@/hooks/use-media-query'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

interface DashboardHeaderProps {
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function DashboardHeader({ onRefresh, isRefreshing }: DashboardHeaderProps) {
  const { profile } = useAuth()
  const isDesktop = useIsDesktopLayout()
  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ??
    profile?.email?.split('@')[0] ??
    'there'

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    'U'

  if (isDesktop) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 wa-canvas-grid opacity-[0.18]"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-wa-green via-wa-teal to-wa-read"
          aria-hidden
        />
        <div className="relative flex flex-row items-center justify-between gap-4 p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-wa-green">
              {getGreeting()}
            </div>
            <h1 className="mt-1.5 truncate text-3xl font-bold text-wa-text">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-sm text-wa-muted">
              {format(new Date(), 'EEEE, d MMMM yyyy')} · Live CRM overview
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="border-wa-border bg-wa-surface/80 text-wa-text hover:bg-wa-elevated"
              >
                <RefreshCw
                  className={cn('size-4', isRefreshing && 'animate-spin')}
                  aria-hidden
                />
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            )}
            <Link href="/inbox">
              <Button
                size="sm"
                className="bg-wa-green text-white hover:bg-wa-teal hover:text-white"
              >
                <Inbox className="size-4" aria-hidden />
                Open Inbox
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile — premium app top bar */}
      <header className="sticky top-0 z-30">
        <div className="wa-mobile-shell border-b border-wa-border/80">
          <div className="h-0.5 bg-gradient-to-r from-wa-green via-wa-teal to-wa-read" aria-hidden />
          <div className="flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Avatar className="size-11 ring-2 ring-wa-green/30 shadow-sm shadow-wa-green/10">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? 'Avatar'} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-wa-green/20 to-wa-teal/10 text-sm font-bold text-wa-green">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-wa-green">
                  {getGreeting()}
                </p>
                <Sparkles className="h-3 w-3 text-wa-green/70" aria-hidden />
              </div>
              <h1 className="truncate text-xl font-bold leading-tight tracking-tight text-wa-text">
                {firstName}
              </h1>
              <p className="truncate text-[11px] text-wa-muted">
                {format(new Date(), 'EEE, d MMM')} · Your CRM hub
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh dashboard"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-wa-surface/80 text-wa-muted shadow-sm transition-all active:scale-95 hover:text-wa-text disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn('h-5 w-5', isRefreshing && 'animate-spin')}
                  />
                </button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
