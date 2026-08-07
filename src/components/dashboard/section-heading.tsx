import { cn } from '@/lib/utils'

const ACCENTS = {
  violet: 'from-violet-500 to-indigo-400 bg-violet-50 text-violet-600',
  blue: 'from-sky-500 to-cyan-400 bg-sky-50 text-sky-600',
  green: 'from-emerald-500 to-teal-400 bg-emerald-50 text-emerald-600',
  amber: 'from-amber-500 to-orange-400 bg-amber-50 text-amber-600',
} as const

interface SectionHeadingProps {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  accent?: keyof typeof ACCENTS
  action?: React.ReactNode
}

export function SectionHeading({
  title,
  description,
  icon: Icon,
  accent = 'violet',
  action,
}: SectionHeadingProps) {
  const tone = ACCENTS[accent]

  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-current/15',
              tone,
            )}
          >
            <Icon className="size-3.5" />
          </span>
        ) : (
          <span
            className={cn('h-4 w-1 shrink-0 rounded-full bg-gradient-to-b', tone)}
            aria-hidden
          />
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold tracking-tight text-slate-800 dark:text-saas-text">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 hidden truncate text-[11px] text-slate-400 sm:block">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}
