import { decrypt } from '@/lib/whatsapp/encryption'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { engineSendText } from '@/lib/automations/meta-send'
import type { AiProvider } from '@/lib/ai/providers'
import { generateChatCompletion } from '@/lib/ai/providers'
import type { ChatMessage } from '@/lib/ai/providers'
import { fetchConversationChatMessages } from '@/lib/ai/conversation-history'
import { syncLeadFromAiConversation } from '@/lib/ai/lead-sync'
import { buildCallPhonePromptBlock, ensureCallPhoneInReply } from '@/lib/ai/call-phone'

export interface AiConfigRow {
  provider: AiProvider
  api_key_encrypted: string | null
  model: string
  system_prompt: string
  auto_reply_enabled: boolean
  skip_if_assigned: boolean
  max_history_messages: number
  lead_sync_enabled: boolean
  lead_pipeline_id: string | null
  lead_stage_id: string | null
  lead_qualify_enabled: boolean
  lead_hot_budget_inr: number
  lead_timeline_max_days: number
  lead_qualify_min_messages: number
  lead_qualify_cooldown_minutes: number
  lead_auto_tag: boolean
  lead_hot_stage_id: string | null
  lead_warm_stage_id: string | null
  lead_cold_stage_id: string | null
  lead_hot_auto_assign: boolean
  lead_hot_assign_agent_id: string | null
  lead_alert_enabled: boolean
  lead_alert_phone: string | null
  call_phone: string | null
  call_phone_in_replies: boolean
}

export interface RunAiReplyArgs {
  userId: string
  contactId: string
  conversationId: string
  /** Latest inbound text (used if history is empty). */
  inboundText?: string
  /** Override system prompt for this run only (automation step). */
  systemPromptOverride?: string
}

export async function loadAiConfig(userId: string): Promise<AiConfigRow | null> {
  const { data, error } = await supabaseAdmin()
    .from('ai_config')
    .select(
      'provider, api_key_encrypted, model, system_prompt, auto_reply_enabled, skip_if_assigned, max_history_messages, lead_sync_enabled, lead_pipeline_id, lead_stage_id, lead_qualify_enabled, lead_hot_budget_inr, lead_timeline_max_days, lead_qualify_min_messages, lead_qualify_cooldown_minutes, lead_auto_tag, lead_hot_stage_id, lead_warm_stage_id, lead_cold_stage_id, lead_hot_auto_assign, lead_hot_assign_agent_id, lead_alert_enabled, lead_alert_phone, call_phone, call_phone_in_replies',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[ai] load config failed:', error)
    return null
  }
  return data as AiConfigRow | null
}

export async function runAiReply(args: RunAiReplyArgs): Promise<string> {
  const config = await loadAiConfig(args.userId)
  if (!config?.api_key_encrypted) {
    throw new Error('AI is not configured — add an API key in Settings → AI')
  }

  let apiKey: string
  try {
    apiKey = decrypt(config.api_key_encrypted)
  } catch {
    throw new Error('AI API key could not be decrypted — re-save in Settings → AI')
  }

  if (config.skip_if_assigned) {
    const { data: conv } = await supabaseAdmin()
      .from('conversations')
      .select('assigned_agent_id')
      .eq('id', args.conversationId)
      .maybeSingle()
    if (conv?.assigned_agent_id) {
      throw new Error('skipped: conversation is assigned to an agent')
    }
  }

  const messages = await buildChatMessages(config, args)
  const basePrompt =
    args.systemPromptOverride?.trim() || config.system_prompt?.trim() || defaultSystemPrompt()
  const callBlock =
    config.call_phone?.trim() && config.call_phone_in_replies !== false
      ? buildCallPhonePromptBlock(config.call_phone)
      : ''
  const systemPrompt = basePrompt + callBlock

  const llmMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  let reply = await generateChatCompletion({
    provider: config.provider as AiProvider,
    apiKey,
    model: config.model,
    messages: llmMessages,
  })

  if (!reply.trim()) {
    throw new Error('AI returned an empty message')
  }

  if (config.call_phone?.trim() && config.call_phone_in_replies !== false) {
    reply = ensureCallPhoneInReply(reply, config.call_phone)
  }

  await engineSendText({
    userId: args.userId,
    conversationId: args.conversationId,
    contactId: args.contactId,
    text: reply.trim(),
  })

  // Fire-and-forget: update pipeline lead + contact note from chat context.
  syncLeadFromAiConversation({
    userId: args.userId,
    contactId: args.contactId,
    conversationId: args.conversationId,
  }).catch((err) => console.error('[ai-lead] post-reply sync:', err))

  return reply.trim()
}

async function buildChatMessages(
  config: AiConfigRow,
  args: RunAiReplyArgs,
): Promise<ChatMessage[]> {
  return fetchConversationChatMessages(
    args.conversationId,
    config.max_history_messages ?? 20,
    args.inboundText,
  )
}

function defaultSystemPrompt(): string {
  return (
    'You are a helpful WhatsApp business assistant. Reply concisely in the same language the customer uses. ' +
    'Be polite and professional. Do not invent prices or policies — say you will check if unsure. ' +
    'Read the full conversation history before replying. Never repeat a question the customer has already answered — move the conversation forward.'
  )
}

/** Global auto-reply from webhook (Settings toggle). */
export async function tryGlobalAiAutoReply(input: {
  userId: string
  contactId: string
  conversationId: string
  inboundText: string
}): Promise<void> {
  try {
    const config = await loadAiConfig(input.userId)
    if (!config?.auto_reply_enabled || !config.api_key_encrypted) return

    await runAiReply({
      userId: input.userId,
      contactId: input.contactId,
      conversationId: input.conversationId,
      inboundText: input.inboundText,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.startsWith('skipped:')) return
    console.error('[ai] global auto-reply failed:', msg)
  }
}
