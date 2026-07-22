'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { isFirebaseClientConfigured } from '@/lib/firebase/config'
import { requestFcmToken } from '@/lib/firebase/client'

const TOKEN_STORAGE_KEY = 'wacrm_fcm_token'

export function PushNotificationsCard() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const firebaseReady = isFirebaseClientConfigured()

  useEffect(() => {
    const supported =
      firebaseReady &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window
    setIsSupported(supported)
    if (supported) {
      setPermission(Notification.permission)
      setIsSubscribed(!!localStorage.getItem(TOKEN_STORAGE_KEY))
    }
    setLoading(false)
  }, [firebaseReady])

  const subscribe = async () => {
    setActionLoading(true)
    try {
      const token = await requestFcmToken()

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcm_token: token,
          device_label: navigator.userAgent.slice(0, 200),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Server rejected FCM token.')
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, token)
      setPermission(Notification.permission)
      setIsSubscribed(true)
      toast.success('Push notifications enabled!')
    } catch (err: unknown) {
      console.error('[fcm subscribe] failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to enable notifications.')
    } finally {
      setActionLoading(false)
    }
  }

  const unsubscribe = async () => {
    setActionLoading(true)
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      if (token) {
        const res = await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcm_token: token }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Server rejected token deletion.')
        }
      }

      localStorage.removeItem(TOKEN_STORAGE_KEY)
      setIsSubscribed(false)
      toast.success('Notifications disabled.')
    } catch (err: unknown) {
      console.error('[fcm unsubscribe] failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to disable notifications.')
    } finally {
      setActionLoading(false)
    }
  }

  if (!firebaseReady) {
    return (
      <Card className="border-wa-border bg-wa-panel/40 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-wa-text">
            <BellOff className="size-4 text-wa-muted" />
            Push Notifications (FCM)
          </CardTitle>
          <CardDescription className="text-wa-muted">
            Firebase Cloud Messaging is not configured yet. Add Firebase env variables
            (see .env.local.example).
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isSupported) {
    return (
      <Card className="border-wa-border bg-wa-panel/40 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-wa-text">
            <BellOff className="size-4 text-wa-muted" />
            Push Notifications (FCM)
          </CardTitle>
          <CardDescription className="text-wa-muted">
            Notifications are not supported in this browser. On iOS, add the app to your
            Home Screen first.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-wa-border bg-wa-panel/40 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-wa-text">
          {isSubscribed ? (
            <Bell className="size-4 animate-pulse text-wa-green" />
          ) : (
            <BellOff className="size-4 text-wa-muted" />
          )}
          Push Notifications (FCM)
        </CardTitle>
        <CardDescription className="text-wa-muted">
          Get instant alerts on your phone or desktop when a customer sends a WhatsApp
          message — works in the browser and installed PWA.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-wa-muted">
            <Loader2 className="size-4 animate-spin text-wa-green" />
            Checking status…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-wa-text">
              Status:{' '}
              {isSubscribed ? (
                <span className="font-semibold text-wa-green">Enabled</span>
              ) : (
                <span className="text-wa-muted">Disabled</span>
              )}
            </div>

            {permission === 'denied' && (
              <p className="text-xs text-red-500">
                Notification permission is blocked. Reset site permissions in your browser
                settings to enable alerts.
              </p>
            )}

            {isSubscribed ? (
              <Button
                type="button"
                variant="outline"
                onClick={unsubscribe}
                disabled={actionLoading}
                className="gap-2 border-red-900/40 hover:bg-red-950/20 hover:text-red-400"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Disabling…
                  </>
                ) : (
                  <>
                    <BellOff className="size-4" />
                    Disable Notifications
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={subscribe}
                disabled={actionLoading || permission === 'denied'}
                className="gap-2 bg-wa-green font-semibold text-black hover:bg-wa-green/80"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-black" />
                    Enabling…
                  </>
                ) : (
                  <>
                    <Bell className="size-4" />
                    Enable Notifications
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
