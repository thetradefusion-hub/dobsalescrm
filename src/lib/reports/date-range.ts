import {
  localDayKey,
  startOfLocalDay,
} from '@/lib/dashboard/date-utils'

export type ReportPresetId =
  | '7d'
  | '30d'
  | '90d'
  | 'this_month'
  | 'last_month'
  | 'all'
  | 'custom'

export interface ReportRangeInput {
  preset: ReportPresetId
  /** YYYY-MM-DD, used when preset = custom */
  customFrom?: string
  /** YYYY-MM-DD inclusive, used when preset = custom */
  customTo?: string
}

export interface ResolvedReportRange {
  preset: ReportPresetId
  from: Date
  /** Exclusive upper bound (start of day after last included day). */
  to: Date
  fromIso: string
  toIso: string
  prevFromIso: string
  prevToIso: string
  dayKeys: string[]
  label: string
}

const PRESET_LABELS: Record<Exclude<ReportPresetId, 'custom'>, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  this_month: 'This month',
  last_month: 'Last month',
  all: 'All time',
}

export function parseLocalDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return startOfLocalDay(new Date(y, m - 1, d))
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

function startOfMonth(d: Date): Date {
  return startOfLocalDay(new Date(d.getFullYear(), d.getMonth(), 1))
}

function endOfMonthExclusive(d: Date): Date {
  return startOfLocalDay(new Date(d.getFullYear(), d.getMonth() + 1, 1))
}

export function dayKeysBetween(from: Date, toExclusive: Date): string[] {
  const keys: string[] = []
  const cur = startOfLocalDay(from)
  const end = startOfLocalDay(toExclusive)
  while (cur < end) {
    keys.push(localDayKey(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return keys
}

function formatRangeLabel(from: Date, toInclusive: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(from)} – ${fmt(toInclusive)}`
}

export function resolveReportRange(input: ReportRangeInput): ResolvedReportRange {
  const now = new Date()
  const todayStart = startOfLocalDay(now)
  let from: Date
  let to: Date
  let label: string

  switch (input.preset) {
    case '7d':
      from = addDays(todayStart, -6)
      to = addDays(todayStart, 1)
      label = PRESET_LABELS['7d']
      break
    case '30d':
      from = addDays(todayStart, -29)
      to = addDays(todayStart, 1)
      label = PRESET_LABELS['30d']
      break
    case '90d':
      from = addDays(todayStart, -89)
      to = addDays(todayStart, 1)
      label = PRESET_LABELS['90d']
      break
    case 'this_month':
      from = startOfMonth(now)
      to = addDays(todayStart, 1)
      label = PRESET_LABELS.this_month
      break
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      from = startOfMonth(lastMonth)
      to = endOfMonthExclusive(lastMonth)
      label = PRESET_LABELS.last_month
      break
    }
    case 'all':
      from = new Date(2020, 0, 1)
      to = addDays(todayStart, 1)
      label = PRESET_LABELS.all
      break
    case 'custom': {
      if (!input.customFrom || !input.customTo) {
        from = addDays(todayStart, -29)
        to = addDays(todayStart, 1)
        label = PRESET_LABELS['30d']
        break
      }
      from = parseLocalDateInput(input.customFrom)
      const toInclusive = parseLocalDateInput(input.customTo)
      to = addDays(toInclusive, 1)
      if (from >= to) {
        to = addDays(from, 1)
      }
      label = formatRangeLabel(from, addDays(to, -1))
      break
    }
    default:
      from = addDays(todayStart, -29)
      to = addDays(todayStart, 1)
      label = PRESET_LABELS['30d']
  }

  const durationMs = to.getTime() - from.getTime()
  const prevTo = from
  const prevFrom = new Date(from.getTime() - durationMs)

  return {
    preset: input.preset,
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    prevFromIso: prevFrom.toISOString(),
    prevToIso: prevTo.toISOString(),
    dayKeys: dayKeysBetween(from, to),
    label,
  }
}

export const REPORT_PRESETS: { id: ReportPresetId; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]
