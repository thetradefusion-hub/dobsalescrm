'use client'

import type { PipelineStage } from '@/types'
import { ChevronDown } from 'lucide-react'
import {
  dedupeStagesByName,
  normalizeStageName,
} from '@/lib/leads/pipeline-stages'

interface LeadStageSelectProps {
  stageId: string
  stages: PipelineStage[]
  disabled?: boolean
  onChange: (stageId: string) => void
}

export function LeadStageSelect({
  stageId,
  stages: stagesProp,
  disabled,
  onChange,
}: LeadStageSelectProps) {
  const stages = dedupeStagesByName(stagesProp)
  const raw = stagesProp.find((s) => s.id === stageId)
  const current =
    stages.find((s) => s.id === stageId) ??
    (raw
      ? stages.find(
          (s) => normalizeStageName(s.name) === normalizeStageName(raw.name),
        )
      : undefined) ??
    raw
  const color = current?.color ?? '#64748b'
  const value =
    current && stages.some((s) => s.id === current.id) ? current.id : ''

  return (
    <div className="relative inline-flex max-w-[170px]">
      <select
        value={value}
        disabled={disabled || stages.length === 0}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation()
          if (e.target.value) onChange(e.target.value)
        }}
        className="h-7 w-full cursor-pointer appearance-none rounded-full border py-0 pl-2.5 pr-7 text-[11px] font-medium outline-none focus:ring-2 focus:ring-wa-green/40 disabled:opacity-50"
        style={{
          backgroundColor: `${color}18`,
          borderColor: `${color}55`,
          color,
        }}
      >
        {!current || !value ? <option value="">Select stage</option> : null}
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 opacity-60" />
    </div>
  )
}
