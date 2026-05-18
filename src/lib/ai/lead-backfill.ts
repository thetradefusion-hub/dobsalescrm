import { supabaseAdmin } from '@/lib/automations/admin-client'
import { loadAiConfig } from '@/lib/ai/run-reply'
import { syncLeadFromAiConversation } from '@/lib/ai/lead-sync'

export interface LeadBackfillResult {
  total: number
  processed: number
  skipped: number
  failed: number
  errors: string[]
}

const DELAY_MS = 600

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Re-run lead qualification on all existing conversations (no new AI reply).
 */
export async function backfillLeadQualification(
  userId: string,
  options?: { skipHotActions?: boolean; limit?: number },
): Promise<LeadBackfillResult> {
  const config = await loadAiConfig(userId)
  if (!config?.lead_sync_enabled || !config.api_key_encrypted) {
    throw new Error('Enable “Sync & qualify leads” and save an API key in Settings → AI first.')
  }

  const db = supabaseAdmin()
  let query = db
    .from('conversations')
    .select('id, contact_id')
    .eq('user_id', userId)
    .not('contact_id', 'is', null)
    .order('updated_at', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data: conversations, error } = await query
  if (error) throw new Error(error.message)

  const result: LeadBackfillResult = {
    total: conversations?.length ?? 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  for (const conv of conversations ?? []) {
    if (!conv.contact_id) {
      result.skipped++
      continue
    }

    try {
      const ok = await syncLeadFromAiConversation(
        {
          userId,
          contactId: conv.contact_id,
          conversationId: conv.id,
        },
        {
          force: true,
          skipHotActions: options?.skipHotActions ?? true,
        },
      )
      if (ok) result.processed++
      else result.skipped++
    } catch (err) {
      result.failed++
      const msg = err instanceof Error ? err.message : String(err)
      if (result.errors.length < 20) result.errors.push(msg)
    }

    await sleep(DELAY_MS)
  }

  return result
}
