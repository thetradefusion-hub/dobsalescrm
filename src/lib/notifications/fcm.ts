import { getFirebaseMessaging } from '@/lib/firebase/admin'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export interface SendFcmOptions {
  userId: string
  contactName: string
  contentText: string
  conversationId: string
}

export async function sendFcmNotificationsForMessage({
  userId,
  contactName,
  contentText,
  conversationId,
}: SendFcmOptions): Promise<void> {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('[fcm] Firebase Admin not configured — skipping push')
    return
  }

  const admin = supabaseAdmin()
  const { data: rows, error } = await admin
    .from('fcm_tokens')
    .select('id, token')
    .eq('user_id', userId)

  if (error) {
    console.error('[fcm] Error fetching tokens:', error)
    return
  }

  if (!rows?.length) return

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wacrm.tech').replace(
    /\/$/,
    '',
  )
  const link = `${siteUrl}/inbox?id=${conversationId}`
  const body =
    contentText.trim().length > 0
      ? contentText.slice(0, 240)
      : 'New WhatsApp message'

  const response = await messaging.sendEachForMulticast({
    tokens: rows.map((r) => r.token),
    notification: {
      title: contactName || 'New message',
      body,
    },
    data: {
      conversationId,
      url: link,
    },
    webpush: {
      fcmOptions: { link },
      notification: {
        icon: `${siteUrl}/globe.svg`,
        badge: `${siteUrl}/globe.svg`,
        tag: `wacrm-message-${conversationId}`,
      },
    },
  })

  const invalidTokenCodes = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
  ])

  await Promise.all(
    response.responses.map(async (res, index) => {
      if (!res.error) return
      const code = res.error.code
      if (!invalidTokenCodes.has(code)) {
        console.error('[fcm] send error:', res.error.message, code)
        return
      }
      const row = rows[index]
      if (!row) return
      const { error: delErr } = await admin.from('fcm_tokens').delete().eq('id', row.id)
      if (delErr) {
        console.error('[fcm] failed to delete stale token:', delErr)
      }
    }),
  )
}
