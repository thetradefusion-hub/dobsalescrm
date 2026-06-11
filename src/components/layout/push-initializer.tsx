'use client'

import { useEffect } from 'react'
import type { BeforeInstallPromptEvent } from '@/lib/pwa'

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent
  }
}

export function PushInitializer() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[service-worker] registered scope:', reg.scope)
        })
        .catch((err) => {
          console.error('[service-worker] registration failed:', err)
        })
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
