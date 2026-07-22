"use client"

import Link from 'next/link'
import { UserPlus, Briefcase, Radio, Zap, ChevronRight, Target } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

interface Action {
  label: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
  iconClass: string
}

const ACTIONS: Action[] = [
  {
    label: 'Lead',
    description: 'Manage opportunities',
    href: '/leads',
    icon: Target,
    iconClass: 'bg-red-500/10 text-red-500 ring-red-500/20 dark:text-red-400',
  },
  {
    label: 'Contact',
    description: 'Add to your CRM',
    href: '/contacts',
    icon: UserPlus,
    iconClass: 'bg-wa-green/10 text-wa-green ring-wa-green/20',
  },
  {
    label: 'Deal',
    description: 'Move pipeline forward',
    href: '/pipelines',
    icon: Briefcase,
    iconClass: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
  },
  {
    label: 'Broadcast',
    description: 'Message your audience',
    href: '/broadcasts/new',
    icon: Radio,
    iconClass: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
  },
  {
    label: 'Automation',
    description: 'Automate workflows',
    href: '/automations/new',
    icon: Zap,
    iconClass: 'bg-wa-teal/10 text-wa-teal ring-wa-teal/20',
  },
]

export function QuickActions() {
  return (
    <section className="px-4 lg:px-0">
      <div className="mb-3 lg:mb-3">
        <h2 className="text-sm font-semibold text-wa-text">Quick actions</h2>
        <p className="mt-0.5 hidden text-xs text-wa-muted sm:block">
          Jump into common tasks
        </p>
      </div>

      {/* Mobile — premium icon grid */}
      <div className="wa-glass-panel rounded-2xl border border-wa-border/70 p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] lg:hidden">
        <div className="grid grid-cols-5 gap-0.5">
          {ACTIONS.map((a) => {
            const Icon = a.icon
            return (
              <Link
                key={a.href}
                href={a.href}
                className="flex flex-col items-center gap-2 rounded-xl px-1 py-3 active:scale-95 active:bg-wa-surface/50"
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ring-1',
                    a.iconClass,
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="text-center text-[10px] font-semibold leading-tight text-wa-text">
                  {a.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop — list cards */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-5">
        {ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-3 rounded-xl border border-wa-border bg-wa-panel px-4 py-3.5 transition-all duration-200 hover:border-wa-green/35 hover:bg-wa-surface/50 hover:shadow-sm"
            >
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105',
                  a.iconClass,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-wa-text">New {a.label}</p>
                <p className="truncate text-xs text-wa-muted">{a.description}</p>
              </div>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-wa-muted transition-transform group-hover:translate-x-0.5 group-hover:text-wa-green"
                aria-hidden
              />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
