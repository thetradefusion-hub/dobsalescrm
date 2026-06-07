'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    deferredPrompt?: any
  }
}

export function PushInitializer() {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
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
      window.deferredPrompt = e
      window.dispatchEvent(new CustomEvent('pwa-install-ready', { detail: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  return null
}

