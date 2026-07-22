'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { setupForegroundMessaging } from '@/lib/firebase/client'
import { isFirebaseClientConfigured } from '@/lib/firebase/config'

export function FcmForegroundListener() {
  useEffect(() => {
    if (!isFirebaseClientConfigured()) return

    let unsubscribe: (() => void) | null = null
    let cancelled = false

    void setupForegroundMessaging((payload) => {
      const title = payload.notification?.title ?? 'New WhatsApp message'
      const body = payload.notification?.body ?? ''
      toast(title, { description: body })

      if (Notification.permission === 'granted') {
        const conversationId = payload.data?.conversationId
        new Notification(title, {
          body,
          icon: '/globe.svg',
          tag: conversationId
            ? `wacrm-message-${conversationId}`
            : 'wacrm-message',
          data: payload.data,
        })
      }
    }).then((unsub) => {
      if (cancelled) {
        unsub?.()
        return
      }
      unsubscribe = unsub ?? null
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return null
}
