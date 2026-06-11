interface SectionHeadingProps {
  title: string
  description?: string
}

export function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-4 lg:px-0">
      <div>
        <h2 className="text-sm font-bold tracking-tight text-wa-text lg:font-semibold">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 hidden text-xs text-wa-muted sm:block">
            {description}
          </p>
        )}
      </div>
      <div
        className="h-1 w-8 shrink-0 rounded-full bg-gradient-to-r from-wa-green to-wa-teal lg:hidden"
        aria-hidden
      />
    </div>
  )
}
