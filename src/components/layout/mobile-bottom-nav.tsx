'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTotalUnread } from '@/hooks/use-total-unread'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MessageSquare,
  GitBranch,
  Users,
  Menu
} from 'lucide-react'

interface MobileBottomNavProps {
  onOpenSidebar: () => void
}

export function MobileBottomNav({ onOpenSidebar }: MobileBottomNavProps) {
  const pathname = usePathname()
  const totalUnread = useTotalUnread()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/inbox', label: 'Inbox', icon: MessageSquare, badge: totalUnread },
    { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
    { href: '/contacts', label: 'Contacts', icon: Users },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block border-t border-wa-border bg-wa-panel/95 backdrop-blur-md px-2 py-1.5 shadow-lg lg:hidden pb-[calc(1.5px+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg px-2.5 py-1 text-center transition-colors duration-200",
                isActive ? "text-wa-green" : "text-wa-muted hover:text-wa-text"
              )}
            >
              <div className="relative flex h-6 w-6 items-center justify-center">
                <item.icon className="h-5 w-5" />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wa-green px-1 text-[10px] font-bold text-black ring-2 ring-wa-panel">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="mt-1 text-[10px] font-medium leading-none tracking-tight">
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* More Button to trigger the slide-out sidebar drawer */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center rounded-lg px-2.5 py-1 text-center text-wa-muted hover:text-wa-text cursor-pointer transition-colors duration-200"
        >
          <div className="flex h-6 w-6 items-center justify-center">
            <Menu className="h-5 w-5" />
          </div>
          <span className="mt-1 text-[10px] font-medium leading-none tracking-tight">
            More
          </span>
        </button>
      </div>
    </nav>
  )
}
