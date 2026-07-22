'use client'

import { useEffect } from 'react'
import type { BeforeInstallPromptEvent } from '@/lib/pwa'
import { isFirebaseClientConfigured } from '@/lib/firebase/config'
import {
  FCM_TOKEN_STORAGE_KEY,
  registerFcmServiceWorker,
  requestFcmToken,
} from '@/lib/firebase/client'

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent
  }
}

export function PushInitializer() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void registerFcmServiceWorker()
        .then((reg) => {
          console.log('[service-worker] registered scope:', reg.scope)
        })
        .catch((err) => {
          console.error('[service-worker] registration failed:', err)
        })
    }

    // Refresh FCM token quietly if already enabled
    if (
      isFirebaseClientConfigured() &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      localStorage.getItem(FCM_TOKEN_STORAGE_KEY)
    ) {
      void requestFcmToken()
        .then(async (token) => {
          localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token)
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fcm_token: token,
              device_label: navigator.userAgent.slice(0, 200),
            }),
          })
        })
        .catch((err) => console.warn('[fcm] token refresh skipped:', err))
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      window.deferredPrompt = e as BeforeInstallPromptEvent
      window.dispatchEvent(new CustomEvent('pwa-install-ready', { detail: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  return null
}
