import { decrypt } from '@/lib/whatsapp/encryption'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { engineSendText } from '@/lib/automations/meta-send'
import type { AiProvider } from '@/lib/ai/providers'
import { generateChatCompletion } from '@/lib/ai/providers'
import type { ChatMessage } from '@/lib/ai/providers'
import { fetchConversationChatMessages } from '@/lib/ai/conversation-history'
import { syncLeadFromAiConversation } from '@/lib/ai/lead-sync'
import { buildCallPhonePromptBlock, ensureCallPhoneInReply } from '@/lib/ai/call-phone'
import {
  AI_REPLY_STYLE_GUARDRAILS,
  DEFAULT_AI_SYSTEM_PROMPT,
  isNearDuplicateReply,
  polishAiReply,
} from '@/lib/ai/reply-style'

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

/** True if bot/agent already answered after the latest customer message. */
export async function hasOutboundSinceLastCustomer(
  conversationId: string,
): Promise<boolean> {
  const { data: rows, error } = await supabaseAdmin()
    .from('messages')
    .select('sender_type, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error || !rows?.length) return false

  for (const row of rows) {
    if (row.sender_type === 'customer') return false
    if (row.sender_type === 'bot' || row.sender_type === 'agent') return true
  }
  return false
}

async function lastBotReplyText(conversationId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from('messages')
    .select('content_text')
    .eq('conversation_id', conversationId)
    .eq('sender_type', 'bot')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.content_text?.trim() || null
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

  // Prevent double-send (Meta retry / automation + global / race).
  if (await hasOutboundSinceLastCustomer(args.conversationId)) {
    throw new Error('skipped: already replied to this customer message')
  }

  const messages = await buildChatMessages(config, args)
  const basePrompt =
    args.systemPromptOverride?.trim() ||
    config.system_prompt?.trim() ||
    DEFAULT_AI_SYSTEM_PROMPT
  const callBlock =
    config.call_phone?.trim() && config.call_phone_in_replies !== false
      ? buildCallPhonePromptBlock(config.call_phone)
      : ''
  const systemPrompt = basePrompt + AI_REPLY_STYLE_GUARDRAILS + callBlock

  const llmMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  let reply = await generateChatCompletion({
    provider: config.provider as AiProvider,
    apiKey,
    model: config.model,
    messages: llmMessages,
    temperature: 0.75,
    maxTokens: 220,
  })

  reply = polishAiReply(reply)
  if (!reply.trim()) {
    throw new Error('AI returned an empty message')
  }

  if (config.call_phone?.trim() && config.call_phone_in_replies !== false) {
    reply = polishAiReply(ensureCallPhoneInReply(reply, config.call_phone), 380)
  }

  const previousBot = await lastBotReplyText(args.conversationId)
  if (previousBot && isNearDuplicateReply(previousBot, reply)) {
    throw new Error('skipped: near-duplicate of last bot reply')
  }

  // Re-check right before send (automation may have finished concurrently).
  if (await hasOutboundSinceLastCustomer(args.conversationId)) {
    throw new Error('skipped: already replied to this customer message')
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

/** @deprecated Use DEFAULT_AI_SYSTEM_PROMPT from reply-style */
export function defaultSystemPrompt(): string {
  return DEFAULT_AI_SYSTEM_PROMPT
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

    // If an automation (or agent) already answered this inbound, stay quiet.
    if (await hasOutboundSinceLastCustomer(input.conversationId)) {
      return
    }

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
