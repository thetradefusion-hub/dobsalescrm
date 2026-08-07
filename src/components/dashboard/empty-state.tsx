import { BarChart3 } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared empty-state panel for charts that can't render meaningfully
 * without a minimum amount of data. Kept minimal and uniform so the
 * three empty states on the dashboard don't each feel like a
 * different widget.
 */
export function EmptyState({
  title = 'Not enough data yet',
  hint,
  icon: Icon = BarChart3,
  className,
}: {
  title?: string
  hint?: string
  icon?: ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center dark:border-saas-border dark:bg-saas-bg/50',
        className,
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-saas-panel">
        <Icon className="size-4" />
      </div>
      <p className="text-xs font-semibold text-slate-600 dark:text-saas-text">
        {title}
      </p>
      {hint && <p className="max-w-xs text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}
