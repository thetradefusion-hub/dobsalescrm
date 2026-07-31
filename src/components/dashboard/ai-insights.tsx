'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import type { SalesInsight } from '@/lib/dashboard/types'
import { Skeleton } from './skeleton'
import { cn } from '@/lib/utils'

interface AiInsightsProps {
  insights: SalesInsight[]
  loading?: boolean
}

const SEVERITY: Record<
  SalesInsight['severity'],
  string
> = {
  info: 'border-wa-border bg-wa-surface/50 text-wa-text',
  warn: 'border-amber-500/30 bg-amber-500/5 text-wa-text',
  urgent: 'border-red-500/30 bg-red-500/5 text-wa-text',
}

export function AiInsights({ insights, loading }: AiInsightsProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
      <header className="border-b border-wa-border bg-wa-surface/30 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-wa-green" aria-hidden />
          <h2 className="text-sm font-semibold text-wa-text">AI Insights</h2>
        </div>
        <p className="mt-0.5 text-xs text-wa-muted/80">
          Actionable signals from your pipeline
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          insights.map((insight) => {
            const body = (
              <div
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-xs leading-relaxed',
                  SEVERITY[insight.severity],
                  insight.href && 'transition-colors hover:border-wa-green/40',
                )}
              >
                {insight.text}
              </div>
            )
            return insight.href ? (
              <Link key={insight.id} href={insight.href}>
                {body}
              </Link>
            ) : (
              <div key={insight.id}>{body}</div>
            )
          })
        )}
      </div>
    </section>
  )
}
