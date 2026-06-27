import { supabaseAdmin } from './admin-client'
import {
  ANAND_RADIO_HOUSE_AUTOMATIONS,
  ANAND_RADIO_HOUSE_PACK_PREFIX,
  type AutomationPackItem,
} from './packs/anand-radio-house'
import { insertSteps } from './steps-tree'
import { validateStepsForActivation, validateTriggerForActivation } from './validate'

export type PackSlug = 'anand_radio_house'

const PACKS: Record<PackSlug, AutomationPackItem[]> = {
  anand_radio_house: ANAND_RADIO_HOUSE_AUTOMATIONS,
}

export interface ImportPackResult {
  created: number
  skipped: number
  deleted: number
  names: string[]
  errors: string[]
}

export function getPackItems(slug: PackSlug): AutomationPackItem[] {
  return PACKS[slug] ?? []
}

export async function importAutomationPack(
  userId: string,
  slug: PackSlug,
  options?: { replace?: boolean },
): Promise<ImportPackResult> {
  const items = getPackItems(slug)
  if (items.length === 0) {
    return { created: 0, skipped: 0, deleted: 0, names: [], errors: ['Unknown pack'] }
  }

  const db = supabaseAdmin()
  const result: ImportPackResult = {
    created: 0,
    skipped: 0,
    deleted: 0,
    names: [],
    errors: [],
  }

  if (options?.replace) {
    const { data: existing } = await db
      .from('automations')
      .select('id')
      .eq('user_id', userId)
      .like('name', `${ANAND_RADIO_HOUSE_PACK_PREFIX}%`)

    if (existing?.length) {
      const ids = existing.map((r) => r.id)
      await db.from('automation_steps').delete().in('automation_id', ids)
      await db.from('automations').delete().in('id', ids)
      result.deleted = ids.length
    }
  } else {
    const { data: existing } = await db
      .from('automations')
      .select('name')
      .eq('user_id', userId)
      .like('name', `${ANAND_RADIO_HOUSE_PACK_PREFIX}%`)

    const existingNames = new Set((existing ?? []).map((r) => r.name))
    if (existingNames.size > 0) {
      return {
        ...result,
        skipped: items.length,
        errors: [
          'Pack already imported. Use replace=true to remove existing ARH automations first.',
        ],
      }
    }
  }

  for (const item of items) {
    const issues = [
      ...validateTriggerForActivation(item.trigger_type, item.trigger_config),
      ...validateStepsForActivation(
        item.steps as unknown as { step_type: string; step_config: Record<string, unknown> }[],
      ),
    ]
    if (issues.length > 0) {
      result.errors.push(`${item.name}: ${issues[0]?.message ?? 'invalid config'}`)
      continue
    }

    const { data: automation, error: insertErr } = await db
      .from('automations')
      .insert({
        user_id: userId,
        name: item.name,
        description: item.description,
        trigger_type: item.trigger_type,
        trigger_config: item.trigger_config,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertErr || !automation) {
      result.errors.push(`${item.name}: ${insertErr?.message ?? 'insert failed'}`)
      continue
    }

    const stepErr = await insertSteps(
      automation.id,
      item.steps as unknown as Parameters<typeof insertSteps>[1],
    )
    if (stepErr) {
      result.errors.push(`${item.name}: ${stepErr}`)
      await db.from('automations').delete().eq('id', automation.id)
      continue
    }

    result.created += 1
    result.names.push(item.name)
  }

  return result
}
