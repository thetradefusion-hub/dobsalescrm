import type { LeadTemperature } from '@/lib/ai/lead-qualification'
import {
  temperatureBadgeClass,
  temperatureLabel,
} from '@/lib/ai/lead-qualification'

/** Priority badge — uses lead temperature (hot / warm / cold). */
export function LeadPriorityBadge({
  temperature,
}: {
  temperature: LeadTemperature | string | null | undefined
}) {
  if (temperature !== 'hot' && temperature !== 'warm' && temperature !== 'cold') {
    return (
      <span className="inline-flex items-center rounded-full border border-wa-border bg-wa-surface px-2 py-0.5 text-[11px] font-medium text-wa-muted">
        New
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${temperatureBadgeClass(temperature)}`}
    >
      {temperature === 'hot' ? '🔥' : null}
      {temperatureLabel(temperature)}
    </span>
  )
}
