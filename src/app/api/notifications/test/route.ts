import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendFcmNotificationsForMessage } from '@/lib/notifications/fcm'
import { isFirebaseAdminConfigured } from '@/lib/firebase/config'

/** Send a test FCM push to the signed-in user's registered devices. */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Firebase Admin is not configured on the server' },
      { status: 500 },
    )
  }

  try {
    const result = await sendFcmNotificationsForMessage({
      userId: user.id,
      contactName: 'WACRM Test',
      contentText: 'Push notifications are working ✅',
      conversationId: 'test',
    })

    if (result.tokenCount === 0) {
      return NextResponse.json(
        {
          error:
            'No device token saved. Click Enable Notifications again, then retry Send test.',
          ...result,
        },
        { status: 400 },
      )
    }

    if (result.successCount === 0) {
      return NextResponse.json(
        {
          error:
            result.errors[0] ||
            'FCM send failed for all devices. Disable + Enable notifications again.',
          ...result,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[fcm test] failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send test' },
      { status: 500 },
    )
  }
}
