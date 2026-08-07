'use client'

import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/types'
import type { CSSProperties } from 'react'

const FALLBACK_COLORS = [
  '#f97316',
  '#2563eb',
  '#a855f7',
  '#22c55e',
  '#ef4444',
  '#4c1d95',
  '#06b6d4',
]

export function PipelineChevronBar({
  stages,
  counts,
  activeStageId,
  onSelect,
}: {
  stages: PipelineStage[]
  counts: Record<string, number>
  activeStageId?: string
  onSelect: (stageId: string | '') => void
}) {
  if (stages.length === 0) return null

  return (
    <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto pb-1">
      {stages.map((stage, i) => {
        const color =
          stage.color?.trim() || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
        const count = counts[stage.id] ?? 0
        const active = activeStageId === stage.id
        const isFirst = i === 0
        const isLast = i === stages.length - 1

        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onSelect(active ? '' : stage.id)}
            title={stage.name}
            className={cn(
              'relative flex min-w-[5.5rem] flex-1 flex-col items-center justify-center px-2.5 py-2 text-white transition sm:min-w-[7.5rem] sm:px-4 sm:py-2.5',
              'hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
              active && 'ring-2 ring-offset-1 ring-slate-900/20 brightness-110',
            )}
            style={{
              backgroundColor: color,
              clipPath: isFirst
                ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
                : isLast
                  ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)'
                  : 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)',
              marginLeft: i === 0 ? 0 : -10,
              zIndex: stages.length - i,
            }}
          >
            <span className="text-base font-bold tabular-nums leading-none sm:text-lg">
              {count}
            </span>
            <span className="mt-0.5 max-w-full truncate text-[10px] font-semibold opacity-95 sm:text-[11px]">
              {stage.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Soft pastel background from a hex stage color. */
export function stagePastel(hex: string | null | undefined, alpha = 0.12): string {
  const raw = (hex ?? '#94a3b8').replace('#', '')
  if (raw.length !== 6) return `rgba(148, 163, 184, ${alpha})`
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

type AccordionTheme = {
  bg: string
  border: string
  text: string
  style?: CSSProperties
  borderStyle?: CSSProperties
}

/** Soft colored bar theme for lead stage accordion headers (mockup style). */
export function stageAccordionTheme(
  stageName: string,
  color?: string | null,
): AccordionTheme {
  const key = stageName.trim().toLowerCase()
  const map: Record<string, AccordionTheme> = {
    'new lead': {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
    },
    followup: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-900',
    },
    'hot lead': {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-900',
    },
    qualified: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-900',
    },
    'proposal sent': {
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      text: 'text-violet-900',
    },
    negotiation: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-900',
    },
    won: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
    },
    'lead won': {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-900',
    },
    nurturing: {
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      text: 'text-violet-900',
    },
    'good lead': {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
    },
    'no response': {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-900',
    },
    deleted: {
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      text: 'text-teal-900',
    },
    'not interested': {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-700',
    },
    lost: {
      bg: 'bg-slate-100',
      border: 'border-slate-300',
      text: 'text-slate-700',
    },
  }
  if (map[key]) return map[key]

  const soft = color ? stagePastel(color, 0.16) : undefined
  const edge = color ? stagePastel(color, 0.45) : undefined
  return {
    bg: '',
    border: 'border-slate-200',
    text: 'text-slate-800',
    style: soft ? { backgroundColor: soft } : undefined,
    borderStyle: edge ? { borderColor: edge } : undefined,
  }
}


