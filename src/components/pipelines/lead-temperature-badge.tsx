import type { LeadTemperature } from '@/lib/ai/lead-qualification'
import {
  temperatureBadgeClass,
  temperatureLabel,
} from '@/lib/ai/lead-qualification'

export function LeadTemperatureBadge({
  temperature,
  score,
  className = '',
}: {
  temperature: LeadTemperature | string | null | undefined
  score?: number | null
  className?: string
}) {
  if (temperature !== 'hot' && temperature !== 'warm' && temperature !== 'cold') {
    return null
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${temperatureBadgeClass(temperature)} ${className}`}
    >
      {temperature === 'hot' ? '🔥' : null}
      {temperatureLabel(temperature)}
      {score != null ? ` · ${score}` : ''}
    </span>
  )
}
