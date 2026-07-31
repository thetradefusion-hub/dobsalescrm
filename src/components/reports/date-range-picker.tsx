'use client'

import { useMemo } from 'react'
import { CalendarRange } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  localDayKey,
  startOfLocalDay,
} from '@/lib/dashboard/date-utils'
import {
  REPORT_PRESETS,
  type ReportPresetId,
  type ReportRangeInput,
} from '@/lib/reports/date-range'

interface DateRangePickerProps {
  preset: ReportPresetId
  customFrom: string
  customTo: string
  onPresetChange: (preset: ReportPresetId) => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  rangeLabel: string
  /** When true, omit outer card chrome (parent already wraps). */
  embedded?: boolean
}

export function DateRangePicker({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  rangeLabel,
  embedded = false,
}: DateRangePickerProps) {
  const todayKey = useMemo(() => localDayKey(startOfLocalDay()), [])

  return (
    <div
      className={cn(
        embedded
          ? 'flex flex-col gap-3 border-t border-wa-border pt-4'
          : 'flex flex-col gap-3 rounded-2xl border border-wa-border bg-wa-panel p-4 shadow-sm lg:rounded-xl lg:p-5',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          {!embedded && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-wa-green/10 text-wa-green">
              <CalendarRange className="h-4 w-4" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-wa-text">Period</p>
            <p className="text-xs text-wa-muted">{rangeLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-wa-surface/60 p-1">
          {REPORT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                preset === p.id
                  ? 'bg-wa-green text-white shadow-sm'
                  : 'text-wa-muted hover:bg-wa-elevated/60 hover:text-wa-text',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 border-t border-wa-border pt-3">
          <label className="flex flex-col gap-1 text-xs text-wa-muted">
            From
            <Input
              type="date"
              value={customFrom}
              max={customTo || todayKey}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="h-9 w-[160px] border-wa-border bg-wa-surface text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-wa-muted">
            To
            <Input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayKey}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="h-9 w-[160px] border-wa-border bg-wa-surface text-sm"
            />
          </label>
        </div>
      )}
    </div>
  )
}

export function defaultRangeInput(): ReportRangeInput {
  const today = startOfLocalDay()
  const from = new Date(today)
  from.setDate(from.getDate() - 29)
  return {
    preset: '30d',
    customFrom: localDayKey(from),
    customTo: localDayKey(today),
  }
}
