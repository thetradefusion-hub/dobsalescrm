'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { setupForegroundMessaging } from '@/lib/firebase/client'
import { isFirebaseClientConfigured } from '@/lib/firebase/config'

export function FcmForegroundListener() {
  useEffect(() => {
    if (!isFirebaseClientConfigured()) return
    if (typeof window === 'undefined') return

    let unsubscribe: (() => void) | null = null
    let cancelled = false

    void setupForegroundMessaging((payload) => {
      const title =
        payload.notification?.title ||
        payload.data?.title ||
        'New WhatsApp message'
      const body = payload.notification?.body || payload.data?.body || ''

      toast(title, {
        description: body,
        duration: 8000,
      })

      // Always try a system notification while the tab is open
      if (Notification.permission === 'granted') {
        const conversationId = payload.data?.conversationId
        try {
          const n = new Notification(title, {
            body,
            icon: '/pwa-icon',
            tag: conversationId
              ? `wacrm-message-${conversationId}`
              : 'wacrm-message',
            data: payload.data,
            requireInteraction: true,
          })
          n.onclick = () => {
            window.focus()
            if (conversationId && conversationId !== 'test') {
              window.location.href = `/inbox?c=${encodeURIComponent(conversationId)}`
            }
            n.close()
          }
        } catch (err) {
          console.warn('[fcm] foreground Notification() failed:', err)
        }
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
