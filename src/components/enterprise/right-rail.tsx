'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bot,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ActivityTimeline,
  SmartNotifications,
} from '@/components/enterprise/panels'
import type { ActivityItem, SalesInsight } from '@/lib/dashboard/types'

export const RIGHT_RAIL_COLLAPSED_KEY = 'wacrm_dashboard_right_rail'

export function DashboardRightRail({
  insights,
  activity,
  overdueCount,
  hotCount,
  loading,
}: {
  insights: SalesInsight[]
  activity: ActivityItem[]
  overdueCount: number
  hotCount: number
  loading?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(RIGHT_RAIL_COLLAPSED_KEY) === '1') {
        setCollapsed(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(RIGHT_RAIL_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  if (collapsed) {
    return (
      <aside className="hidden w-12 shrink-0 flex-col items-center border-l border-slate-200 bg-white py-3 xl:flex dark:border-saas-border dark:bg-saas-card">
        <button
          type="button"
          onClick={toggle}
          aria-label="Expand assistant panel"
          className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-violet-50 hover:text-violet-600"
        >
          <PanelRightOpen className="size-4" />
        </button>
        <Bot className="mt-4 size-5 text-violet-400" />
      </aside>
    )
  }

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white xl:flex dark:border-saas-border dark:bg-saas-card">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-saas-border">
        <p className="text-sm font-semibold text-slate-800 dark:text-saas-text">
          AI Copilot
        </p>
        <button
          type="button"
          onClick={toggle}
          aria-label="Collapse assistant panel"
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
        >
          <PanelRightClose className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 dark:border-saas-border dark:from-violet-500/10 dark:to-saas-card">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/30">
              <Bot className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-saas-text">
                How can I help you today?
              </p>
              <p className="text-[11px] text-slate-400">
                Sales tips from your pipeline
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href="/leads?filter=hot"
              className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
            >
              Show hot leads
            </Link>
            <Link
              href="/leads?filter=overdue"
              className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
            >
              Overdue follow-ups
            </Link>
            <Link
              href="/reports"
              className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
            >
              Why did revenue drop?
            </Link>
          </div>
          <Link
            href="/settings?tab=ai"
            className="mt-3 flex w-full items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs text-slate-400 shadow-sm transition hover:border-violet-300"
          >
            <Sparkles className="size-3.5 text-violet-500" />
            Ask anything…
          </Link>
        </div>

        {!loading && (
          <SmartNotifications
            insights={insights}
            overdueCount={overdueCount}
            hotCount={hotCount}
          />
        )}

        <ActivityTimeline items={activity} loading={loading} />
      </div>
    </aside>
  )
}
