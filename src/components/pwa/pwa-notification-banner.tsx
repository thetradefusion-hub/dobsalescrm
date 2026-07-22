'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { isFirebaseClientConfigured } from '@/lib/firebase/config'
import {
  FCM_TOKEN_STORAGE_KEY,
  requestFcmToken,
} from '@/lib/firebase/client'
import { isStandalone } from '@/lib/pwa'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'wacrm_pwa_notif_dismissed'

/**
 * When the installed PWA is open without push enabled, nudge the user.
 * Android/desktop PWAs need permission granted inside the standalone window.
 */
export function PwaNotificationBanner({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isStandalone() || !isFirebaseClientConfigured()) return
    if (typeof Notification === 'undefined') return
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    const hasToken = !!localStorage.getItem(FCM_TOKEN_STORAGE_KEY)
    const granted = Notification.permission === 'granted'
    if (hasToken && granted) return

    const t = window.setTimeout(() => setVisible(true), 900)
    return () => window.clearTimeout(t)
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }, [])

  const enable = useCallback(async () => {
    setLoading(true)
    try {
      const token = await requestFcmToken()
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcm_token: token,
          device_label: `pwa:${navigator.userAgent.slice(0, 180)}`,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save notification token')
      }
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token)
      localStorage.removeItem(DISMISS_KEY)
      setVisible(false)
      toast.success('PWA notifications enabled')

      const testRes = await fetch('/api/notifications/test', { method: 'POST' })
      const testData = await testRes.json().catch(() => ({}))
      if (testRes.ok) {
        toast.message('Test notification sent — check your phone')
      } else {
        toast.error(testData.error || 'Test push failed')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not enable notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed inset-x-3 bottom-[4.75rem] z-50 mx-auto max-w-lg rounded-2xl border border-wa-border bg-wa-panel/95 p-3 shadow-lg backdrop-blur-md lg:bottom-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wa-green/15 text-wa-green">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-wa-text">Enable message alerts</p>
          <p className="mt-0.5 text-xs text-wa-muted">
            Get a notification on this app when a WhatsApp message arrives.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={enable}
              disabled={loading}
              className="h-8 bg-wa-green px-3 text-xs font-semibold text-black hover:bg-wa-green/85"
            >
              {loading ? 'Enabling…' : 'Enable notifications'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss}
              className="h-8 px-2 text-xs text-wa-muted"
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="rounded-md p-1 text-wa-muted hover:bg-wa-surface hover:text-wa-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
