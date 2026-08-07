'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  Bell,
  GitBranch,
  LogOut,
  Menu,
  Phone,
  Plus,
  Radio,
  Search,
  Settings as SettingsIcon,
  User,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CommandPaletteTrigger,
  OPEN_COMMAND_PALETTE,
} from '@/components/enterprise/command-palette'
import { useTotalUnread } from '@/hooks/use-total-unread'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inbox': 'Inbox',
  '/contacts': 'Contacts',
  '/leads': 'Leads',
  '/tasks': 'Tasks',
  '/reports': 'Reports',
  '/pipelines': 'Pipelines',
  '/broadcasts': 'Broadcasts',
  '/automations': 'Automations',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  )
  return match ? match[1] : 'Dashboard'
}

interface HeaderProps {
  onOpenSidebar?: () => void
  className?: string
}

export function Header({ onOpenSidebar, className }: HeaderProps) {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const title = getPageTitle(pathname)
  const totalUnread = useTotalUnread()
  const isDashboard = pathname === '/dashboard'

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    'U'

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl lg:px-6 dark:border-saas-border dark:bg-saas-card/95',
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {!isDashboard && (
        <h1 className="min-w-0 truncate text-base font-semibold text-slate-900 sm:text-lg dark:text-saas-text">
          {title}
        </h1>
      )}

      {isDashboard && (
        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <CommandPaletteTrigger className="w-full max-w-xl justify-between rounded-full border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500 shadow-none hover:border-violet-300 hover:bg-white" />
        </div>
      )}

      {!isDashboard && <div className="flex-1" />}

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {isDashboard && (
          <>
            <Link
              href="/leads"
              className="hidden items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-500 sm:inline-flex"
            >
              <Plus className="size-3.5" />
              Add Lead
            </Link>
            <Link
              href="/broadcasts/new"
              className="hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 lg:inline-flex"
            >
              <Radio className="size-3.5" />
              Broadcast
            </Link>
            <Link
              href="/pipelines"
              className="hidden items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 lg:inline-flex"
            >
              <GitBranch className="size-3.5" />
              Create Deal
            </Link>

            <Link
              href="/tasks"
              aria-label="Calls / Tasks"
              className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <Phone className="size-4" strokeWidth={1.75} />
            </Link>
            <Link
              href="/inbox"
              aria-label="WhatsApp inbox"
              className="relative flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <WhatsAppIcon className="size-4" />
              {totalUnread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </Link>
            <button
              type="button"
              aria-label="Notifications"
              onClick={() =>
                window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))
              }
              className="relative flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <Bell className="size-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Search"
              onClick={() =>
                window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))
              }
              className="flex size-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 md:hidden"
            >
              <Search className="size-4" />
            </button>
          </>
        )}

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-xl px-1 py-1 transition-colors hover:bg-slate-50 focus:outline-none sm:gap-2.5 sm:pl-1 sm:pr-2.5"
            aria-label="Open account menu"
          >
            <Avatar className="size-9 ring-2 ring-violet-100">
              {profile?.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.full_name ?? 'Avatar'}
                />
              ) : null}
              <AvatarFallback className="bg-violet-600 text-sm font-semibold text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight text-slate-800 dark:text-saas-text">
                {profile?.full_name?.split(' ')[0] ?? 'User'}
              </span>
              <span className="block text-[11px] leading-tight text-slate-400">
                {profile?.role ?? 'Sales Manager'}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="min-w-56 bg-white text-slate-800 ring-slate-200"
          >
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">
                {profile?.full_name ?? 'User'}
              </p>
              <p className="truncate text-xs text-slate-400">
                {profile?.email ?? ''}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link
                  href="/settings?tab=profile"
                  className="focus:bg-slate-50"
                />
              }
            >
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <Link href="/settings" className="focus:bg-slate-50" />
              }
            >
              <SettingsIcon className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
