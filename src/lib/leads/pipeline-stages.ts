import type { SupabaseClient } from '@supabase/supabase-js'
import type { DealStatus, PipelineStage } from '@/types'

/** Canonical lead/pipeline stages used across Pipelines + Leads. */
export const DEFAULT_LEAD_STAGES = [
  { name: 'New Lead', color: '#3b82f6', position: 0 },
  { name: 'Qualified', color: '#eab308', position: 1 },
  { name: 'Proposal Sent', color: '#f97316', position: 2 },
  { name: 'Negotiation', color: '#8b5cf6', position: 3 },
  { name: 'Won', color: '#22c55e', position: 4 },
  { name: 'Not Interested', color: '#94a3b8', position: 5 },
  { name: 'Lost', color: '#ef4444', position: 6 },
] as const

const CLOSED_LOST_NAMES = ['not interested', 'lost', 'disqualified', 'rejected']
const WON_NAMES = ['won', 'closed won']

/** Normalize stage names so typos / spacing still match. */
export function normalizeStageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/intrested/g, 'interested')
}

export function dealStatusForStageName(stageName: string): DealStatus {
  const n = normalizeStageName(stageName)
  if (WON_NAMES.some((w) => n === w || n.includes(w))) return 'won'
  if (CLOSED_LOST_NAMES.some((w) => n === w || n.includes(w))) return 'lost'
  return 'open'
}

/** One in-flight ensure per pipeline — prevents StrictMode double-insert. */
const ensureLocks = new Map<string, Promise<PipelineStage[]>>()

/**
 * Ensure a pipeline has the standard lead stages (incl. Not Interested / Lost).
 * Also removes duplicate stage names created by race / double-mount.
 */
export async function ensurePipelineLeadStages(
  supabase: SupabaseClient,
  pipelineId: string,
): Promise<PipelineStage[]> {
  const existing = ensureLocks.get(pipelineId)
  if (existing) return existing

  const run = (async () => {
    try {
      return await ensurePipelineLeadStagesInner(supabase, pipelineId)
    } finally {
      ensureLocks.delete(pipelineId)
    }
  })()

  ensureLocks.set(pipelineId, run)
  return run
}

async function ensurePipelineLeadStagesInner(
  supabase: SupabaseClient,
  pipelineId: string,
): Promise<PipelineStage[]> {
  const { data: existing, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('position')

  if (error) throw new Error(error.message)

  let stages = (existing ?? []) as PipelineStage[]

  // Collapse duplicates (same normalized name) — keep earliest by position.
  const byName = new Map<string, PipelineStage>()
  const duplicateIds: string[] = []

  for (const stage of stages) {
    const key = normalizeStageName(stage.name)
    const kept = byName.get(key)
    if (!kept) {
      byName.set(key, stage)
      continue
    }
    // Prefer canonical casing from DEFAULT_LEAD_STAGES when possible
    const canonical = DEFAULT_LEAD_STAGES.find(
      (d) => normalizeStageName(d.name) === key,
    )
    if (canonical && kept.name !== canonical.name) {
      duplicateIds.push(kept.id)
      byName.set(key, stage)
    } else {
      duplicateIds.push(stage.id)
    }
  }

  if (duplicateIds.length > 0) {
    // Move deals off duplicate stages onto the kept stage
    for (const dupId of duplicateIds) {
      const dup = stages.find((s) => s.id === dupId)
      if (!dup) continue
      const keep = byName.get(normalizeStageName(dup.name))
      if (!keep || keep.id === dupId) continue
      await supabase
        .from('deals')
        .update({ stage_id: keep.id })
        .eq('stage_id', dupId)
    }

    await supabase.from('pipeline_stages').delete().in('id', duplicateIds)
    stages = [...byName.values()].sort((a, b) => a.position - b.position)
  }

  const have = new Set(
    stages.map((s) => normalizeStageName(s.name)),
  )

  const missing = DEFAULT_LEAD_STAGES.filter(
    (s) => !have.has(normalizeStageName(s.name)),
  )

  if (missing.length === 0) {
    return stages.sort((a, b) => a.position - b.position)
  }

  // Re-check right before insert (another tab / call may have inserted)
  const { data: fresh } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('pipeline_id', pipelineId)

  const freshHave = new Set(
    (fresh ?? []).map((s) => normalizeStageName(s.name)),
  )
  const stillMissing = missing.filter(
    (s) => !freshHave.has(normalizeStageName(s.name)),
  )

  if (stillMissing.length === 0) {
    const { data: all } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position')
    return (all ?? []) as PipelineStage[]
  }

  const maxPos = stages.reduce((m, s) => Math.max(m, s.position ?? 0), -1)
  const payload = stillMissing.map((s, i) => ({
    pipeline_id: pipelineId,
    name: s.name,
    color: s.color,
    position: Math.max(s.position, maxPos + 1 + i),
  }))

  const { error: insertErr } = await supabase
    .from('pipeline_stages')
    .insert(payload)

  if (insertErr) {
    // Unique race — ignore and reload
    console.warn('[leads] stage insert race:', insertErr.message)
  }

  const { data: finalRows, error: reloadErr } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('position')

  if (reloadErr) throw new Error(reloadErr.message)

  // Final dedupe pass on returned list (UI safety)
  return dedupeStagesByName((finalRows ?? []) as PipelineStage[])
}

/** Deduplicate stages for dropdown display (keep first of each name per pipeline). */
export function dedupeStagesByName(stages: PipelineStage[]): PipelineStage[] {
  const seen = new Set<string>()
  const out: PipelineStage[] = []
  for (const s of [...stages].sort((a, b) => a.position - b.position)) {
    const key = `${s.pipeline_id}:${normalizeStageName(s.name)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}
