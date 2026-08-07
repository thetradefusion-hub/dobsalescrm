'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTotalUnread } from '@/hooks/use-total-unread'
import { useAuth } from '@/hooks/use-auth'
import { permissionForNav } from '@/lib/auth/roles'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Menu,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'

interface MobileBottomNavProps {
  onOpenSidebar: () => void
  className?: string
}

export function MobileBottomNav({ onOpenSidebar, className }: MobileBottomNavProps) {
  const pathname = usePathname()
  const totalUnread = useTotalUnread()
  const { permissions } = useAuth()

  const navItems: {
    href: string
    label: string
    icon: LucideIcon | typeof WhatsAppIcon
    badge?: number
  }[] = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/inbox', label: 'Inbox', icon: WhatsAppIcon, badge: totalUnread },
    { href: '/leads', label: 'Leads', icon: Target },
    { href: '/broadcasts', label: 'Bulk', icon: Megaphone },
    { href: '/contacts', label: 'Contacts', icon: Users },
  ].filter((item) => permissionForNav(item.href, permissions))

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden',
        className,
      )}
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around rounded-2xl border border-wa-border/70 bg-wa-panel/92 px-1 py-1.5 shadow-[0_-2px_20px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:shadow-[0_-2px_20px_rgba(0,0,0,0.3),0_8px_32px_rgba(0,0,0,0.4)]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-w-[3.5rem] flex-1 flex-col items-center justify-center rounded-xl px-1.5 py-1 transition-all duration-200 active:scale-95',
                isActive
                  ? 'text-wa-green'
                  : 'text-wa-muted active:bg-wa-surface/60',
              )}
            >
              {isActive && (
                <span
                  className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-wa-green"
                  aria-hidden
                />
              )}
              <div className="relative flex h-6 w-6 items-center justify-center">
                <item.icon
                  className={cn('h-5 w-5', isActive && 'stroke-[2.5]')}
                />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wa-green px-1 text-[10px] font-bold text-white ring-2 ring-wa-panel">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={cn(
                  'mt-0.5 text-[10px] font-medium leading-none',
                  isActive && 'font-bold',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="flex min-w-[3.5rem] flex-1 flex-col items-center justify-center rounded-xl px-1.5 py-1 text-wa-muted transition-all duration-200 active:scale-95 active:bg-wa-surface/60"
        >
          <div className="flex h-6 w-6 items-center justify-center">
            <Menu className="h-5 w-5" />
          </div>
          <span className="mt-0.5 text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  )
}
