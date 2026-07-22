import { getFirebaseMessaging } from '@/lib/firebase/admin'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export interface SendFcmOptions {
  userId: string
  contactName: string
  contentText: string
  conversationId: string
}

export interface SendFcmResult {
  successCount: number
  failureCount: number
  tokenCount: number
  errors: string[]
}

export async function sendFcmNotificationsForMessage({
  userId,
  contactName,
  contentText,
  conversationId,
}: SendFcmOptions): Promise<SendFcmResult> {
  const empty: SendFcmResult = {
    successCount: 0,
    failureCount: 0,
    tokenCount: 0,
    errors: [],
  }

  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('[fcm] Firebase Admin not configured — skipping push')
    return { ...empty, errors: ['Firebase Admin not configured'] }
  }

  const admin = supabaseAdmin()
  const { data: rows, error } = await admin
    .from('fcm_tokens')
    .select('id, token')
    .eq('user_id', userId)

  if (error) {
    console.error('[fcm] Error fetching tokens:', error)
    return { ...empty, errors: [error.message] }
  }

  if (!rows?.length) {
    console.warn('[fcm] No FCM tokens for user', userId)
    return { ...empty, errors: ['No FCM tokens registered for this user'] }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  )
  const link = `${siteUrl}/inbox?c=${encodeURIComponent(conversationId)}`
  const title = contactName || 'New message'
  const body =
    contentText.trim().length > 0
      ? contentText.slice(0, 240)
      : 'New WhatsApp message'

  // Data-only payload: service worker always shows the notification.
  // (Notification+data payloads are unreliable when the tab is focused.)
  const response = await messaging.sendEachForMulticast({
    tokens: rows.map((r) => r.token),
    data: {
      title,
      body,
      conversationId,
      url: link,
    },
    webpush: {
      headers: {
        Urgency: 'high',
        TTL: '86400',
      },
      fcmOptions: {
        link,
      },
    },
  })

  console.log(
    `[fcm] sent=${response.successCount} failed=${response.failureCount} user=${userId}`,
  )

  const invalidTokenCodes = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
  ])

  const errors: string[] = []

  await Promise.all(
    response.responses.map(async (res, index) => {
      if (!res.error) return
      const code = res.error.code
      const message = res.error.message
      errors.push(`${code}: ${message}`)
      console.error('[fcm] send error:', message, code)
      if (!invalidTokenCodes.has(code)) return
      const row = rows[index]
      if (!row) return
      const { error: delErr } = await admin.from('fcm_tokens').delete().eq('id', row.id)
      if (delErr) {
        console.error('[fcm] failed to delete stale token:', delErr)
      } else {
        console.log('[fcm] deleted stale token', row.id)
      }
    }),
  )

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    tokenCount: rows.length,
    errors,
  }
}
