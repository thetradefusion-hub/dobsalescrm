import { supabaseAdmin } from '@/lib/automations/admin-client'
import { sendDirectWhatsAppText } from '@/lib/whatsapp/direct-send'
import type { AiConfigRow } from '@/lib/ai/run-reply'
import type { LeadQualificationExtract } from '@/lib/ai/lead-qualification'
import { temperatureLabel } from '@/lib/ai/lead-qualification'

/**
 * On newly qualified HOT lead: assign conversation + deal, WhatsApp alert to owner.
 */
export async function handleHotLeadActions(input: {
  userId: string
  contactId: string
  conversationId: string
  dealId?: string
  contactName: string | null
  contactPhone: string | null
  qualified: LeadQualificationExtract
  config: AiConfigRow
}): Promise<void> {
  const tasks: Promise<void>[] = []

  if (input.config.lead_hot_auto_assign !== false) {
    tasks.push(
      assignHotLead(input.userId, input.contactId, input.conversationId, input.dealId, input.config),
    )
  }

  if (input.config.lead_alert_enabled !== false && input.config.lead_alert_phone?.trim()) {
    tasks.push(
      sendHotLeadWhatsAppAlert({
        userId: input.userId,
        alertPhone: input.config.lead_alert_phone.trim(),
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        qualified: input.qualified,
      }),
    )
  }

  await Promise.allSettled(tasks).then((results) => {
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('[ai-lead] hot lead action failed:', r.reason)
      }
    }
  })
}

async function assignHotLead(
  userId: string,
  contactId: string,
  conversationId: string,
  dealId: string | undefined,
  config: AiConfigRow,
): Promise<void> {
  const db = supabaseAdmin()
  const agentId = config.lead_hot_assign_agent_id?.trim() || userId
  const now = new Date().toISOString()

  await db
    .from('conversations')
    .update({ assigned_agent_id: agentId, updated_at: now })
    .eq('id', conversationId)
    .eq('user_id', userId)

  if (dealId) {
    await db
      .from('deals')
      .update({ assigned_to: agentId, updated_at: now })
      .eq('id', dealId)
      .eq('user_id', userId)
  } else {
    await db
      .from('deals')
      .update({ assigned_to: agentId, updated_at: now })
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .eq('status', 'open')
  }
}

async function sendHotLeadWhatsAppAlert(input: {
  userId: string
  alertPhone: string
  contactName: string | null
  contactPhone: string | null
  qualified: LeadQualificationExtract
}): Promise<void> {
  const q = input.qualified
  const name = input.contactName || input.contactPhone || 'Unknown'
  const budget =
    q.budget_inr != null ? `₹${q.budget_inr.toLocaleString('en-IN')}` : 'not shared'
  const timeline =
    q.timeline_days != null ? `${q.timeline_days} days` : 'not shared'

  const text = `🔥 HOT LEAD — ${temperatureLabel('hot')}

${name}${input.contactPhone ? ` (${input.contactPhone})` : ''}

${q.title}
Service: ${q.service ?? '—'}
Budget: ${budget}
Timeline: ${timeline}
Score: ${q.score}

${q.summary}

Next: ${q.recommended_next_step}

— Digital One Box Sales CRM`

  await sendDirectWhatsAppText(input.userId, input.alertPhone, text.slice(0, 4000))
}
