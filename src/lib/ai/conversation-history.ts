import { supabaseAdmin } from '@/lib/automations/admin-client'
import type { ChatMessage } from '@/lib/ai/providers'

function formatMessageForLlm(
  contentType: string | null,
  contentText: string | null,
): string | null {
  if (contentText?.trim()) return contentText.trim()
  if (!contentType || contentType === 'text') return null
  return `[${contentType} message]`
}

/** Latest N messages in chronological order for LLM context. */
export async function fetchConversationChatMessages(
  conversationId: string,
  limit: number,
  fallbackInbound?: string,
): Promise<ChatMessage[]> {
  const cap = Math.min(Math.max(limit, 1), 50)

  const { data: rows, error } = await supabaseAdmin()
    .from('messages')
    .select('sender_type, content_text, content_type, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(cap)

  if (error) {
    console.error('[ai] history fetch failed:', error)
  }

  const out: ChatMessage[] = []
  for (const row of [...(rows ?? [])].reverse()) {
    const text = formatMessageForLlm(row.content_type, row.content_text)
    if (!text) continue
    out.push({
      role: row.sender_type === 'customer' ? 'user' : 'assistant',
      content: text,
    })
  }

  if (out.length === 0 && fallbackInbound?.trim()) {
    out.push({ role: 'user', content: fallbackInbound.trim() })
  }

  return out
}
