import { cn } from '@/lib/utils'

/**
 * Shared skeleton primitive — a pulsing slate block sized to whatever
 * container it's dropped into. Used by every dashboard widget while
 * its data fetches.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-wa-surface', className)} />
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-wa-border bg-wa-panel p-4 lg:rounded-xl lg:p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-8 w-24" />
      <Skeleton className="mt-3 h-4 w-32" />
    </div>
  )
}
