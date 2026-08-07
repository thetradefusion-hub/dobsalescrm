import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Find an existing conversation for a contact under the account,
 * or create an open one. Returns conversation id for /inbox?c= deep-link.
 */
export async function ensureConversationForContact(
  supabase: SupabaseClient,
  authUserId: string,
  contactId: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', authUserId)
    .maybeSingle()

  const accountUserId = profile?.account_id || authUserId

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', accountUserId)
    .eq('contact_id', contactId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) return existing.id

  // Fallback: any conversation for contact (RLS may already scope)
  const { data: anyExisting } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (anyExisting?.id) return anyExisting.id

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      user_id: accountUserId,
      contact_id: contactId,
      status: 'open',
      assigned_agent_id: authUserId,
      unread_count: 0,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Could not open WhatsApp chat')
  }

  return created.id
}
