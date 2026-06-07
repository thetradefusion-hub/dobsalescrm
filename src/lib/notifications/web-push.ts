import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/automations/admin-client'

let isConfigured = false

function initWebPush() {
  if (isConfigured) return true

  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@wacrm.tech'
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    console.warn(
      '[web-push] Warning: NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing in environment. Web Push Notifications are disabled.'
    )
    return false
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    isConfigured = true
    return true
  } catch (err) {
    console.error('[web-push] Failed to configure web-push VAPID details:', err)
    return false
  }
}

export interface SendPushOptions {
  userId: string
  contactName: string
  contentText: string
  conversationId: string
}

export async function sendPushNotificationsForMessage({
  userId,
  contactName,
  contentText,
  conversationId,
}: SendPushOptions) {
  if (!initWebPush()) return

  // Query push subscriptions for this user from Supabase
  const { data: subscriptions, error } = await supabaseAdmin()
    .from('push_subscriptions')
    .select('id, endpoint, keys')
    .eq('user_id', userId)

  if (error) {
    console.error('[web-push] Error fetching subscriptions:', error)
    return
  }

  if (!subscriptions || subscriptions.length === 0) {
    return
  }

  const payload = JSON.stringify({
    title: contactName,
    body: contentText,
    icon: '/globe.svg',
    badge: '/globe.svg',
    tag: `wacrm-message-${conversationId}`,
    data: {
      conversationId,
    },
  })

  const admin = supabaseAdmin()

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const subscriptionObj = {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string },
        }
        await webpush.sendNotification(subscriptionObj, payload)
      } catch (err: any) {
        console.error(
          '[web-push] Failed to send notification to endpoint:',
          sub.endpoint,
          err
        )
        // If subscription is no longer valid (410 Gone or 404 Not Found), delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log('[web-push] Subscription has expired or is invalid. Deleting from DB…')
          const { error: delErr } = await admin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
          if (delErr) {
            console.error('[web-push] Error deleting invalid subscription:', delErr)
          }
        }
      }
    })
  )
}
