import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * After a broadcast template is delivered via Meta, mirror it into the
 * contact's inbox conversation so agents see image + text history.
 * Uses service-role client (bypasses RLS) — the browser client path was
 * silently failing to insert for some sessions.
 */
export async function persistBroadcastMessageToInbox(args: {
  admin: SupabaseClient
  userId: string
  contactId: string
  templateName: string
  bodyText: string
  mediaUrl?: string | null
  whatsappMessageId?: string | null
}): Promise<{ conversationId: string } | { error: string }> {
  const {
    admin,
    userId,
    contactId,
    templateName,
    bodyText,
    mediaUrl,
    whatsappMessageId,
  } = args

  let conversationId: string | null = null

  const { data: existing, error: findErr } = await admin
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .maybeSingle()

  if (findErr) return { error: findErr.message }

  if (existing?.id) {
    conversationId = existing.id
  } else {
    const { data: created, error: createErr } = await admin
      .from('conversations')
      .insert({
        user_id: userId,
        contact_id: contactId,
        status: 'open',
      })
      .select('id')
      .single()
    if (createErr || !created) {
      return { error: createErr?.message ?? 'failed to create conversation' }
    }
    conversationId = created.id as string
  }

  // Idempotent: if this WhatsApp message id is already in inbox, skip.
  if (whatsappMessageId) {
    const { data: dup } = await admin
      .from('messages')
      .select('id')
      .eq('message_id', whatsappMessageId)
      .maybeSingle()
    if (dup?.id) {
      return { conversationId }
    }
  }

  const preview = (bodyText.trim() || `[template:${templateName}]`).slice(0, 200)

  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_type: 'bot',
    content_type: 'template',
    content_text: bodyText || null,
    media_url: mediaUrl || null,
    template_name: templateName,
    message_id: whatsappMessageId || null,
    status: 'sent',
  })

  if (msgErr) return { error: msgErr.message }

  await admin
    .from('conversations')
    .update({
      last_message_text: preview,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  return { conversationId }
}

/** Lazy admin client for scripts / routes that already have env loaded. */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
