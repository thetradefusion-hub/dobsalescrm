import { sendTextMessage } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  sanitizePhoneForMeta,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/phone-utils'
import { supabaseAdmin } from '@/lib/automations/admin-client'

/**
 * Send a WhatsApp text to an arbitrary E.164 number (e.g. owner alert phone).
 * Does not create a CRM conversation/message row.
 */
export async function sendDirectWhatsAppText(
  userId: string,
  toPhone: string,
  text: string,
): Promise<{ messageId: string }> {
  const sanitized = sanitizePhoneForMeta(toPhone)
  if (!isValidE164(sanitized)) {
    throw new Error(`Invalid alert phone: ${toPhone}`)
  }

  const db = supabaseAdmin()
  const { data: config, error: configErr } = await db
    .from('whatsapp_config')
    .select('phone_number_id, access_token, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (configErr || !config?.access_token || config.status !== 'connected') {
    throw new Error('WhatsApp not connected')
  }

  const accessToken = decrypt(config.access_token)
  const variants = phoneVariants(sanitized)
  let lastError: unknown = null

  for (const v of variants) {
    try {
      const r = await sendTextMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: v,
        text,
      })
      return { messageId: r.messageId }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!isRecipientNotAllowedError(msg)) throw err
      lastError = err
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Alert send failed')
}
