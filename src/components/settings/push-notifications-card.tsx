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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationsCard() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)

      navigator.serviceWorker.ready
        .then((reg) => {
          reg.pushManager
            .getSubscription()
            .then((sub) => {
              setIsSubscribed(!!sub)
              setLoading(false)
            })
            .catch((err) => {
              console.error('Error getting subscription status:', err)
              setLoading(false)
            })
        })
        .catch((err) => {
          console.error('Service worker is not ready:', err)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const subscribe = async () => {
    setActionLoading(true)
    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult !== 'granted') {
        toast.error('Notification permission denied. Please enable it in browser settings.')
        setActionLoading(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        throw new Error('VAPID public key is missing on the client side.')
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Server rejected subscription.')
      }

      setIsSubscribed(true)
      toast.success('Push notifications successfully enabled!')
    } catch (err: unknown) {
      console.error('[subscribe] Failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to enable notifications.')
    } finally {
      setActionLoading(false)
    }
  }

  const unsubscribe = async () => {
    setActionLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()

      if (subscription) {
        const res = await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Server rejected subscription deletion.')
        }

        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      toast.success('Notifications successfully disabled.')
    } catch (err: unknown) {
      console.error('[unsubscribe] Failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to disable notifications.')
    } finally {
      setActionLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <Card className="bg-wa-panel/40 border-wa-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-wa-text">
            <BellOff className="size-4 text-wa-muted" />
            Push Notifications
          </CardTitle>
          <CardDescription className="text-wa-muted">
            Web Push notifications are not supported by this browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-wa-muted">
          Please check that you are using a modern browser (Chrome, Safari, Firefox). On iOS, you must first add this app to your Home Screen.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-wa-panel/40 border-wa-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-wa-text">
          {isSubscribed ? (
            <Bell className="size-4 text-wa-green animate-pulse" />
          ) : (
            <BellOff className="size-4 text-wa-muted" />
          )}
          Push Notifications
        </CardTitle>
        <CardDescription className="text-wa-muted">
          Receive real-time alerts on your device when a customer sends a message on the WhatsApp Business API.
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
                <span className="text-wa-green font-semibold">Enabled (Active)</span>
              ) : (
                <span className="text-wa-muted">Disabled</span>
              )}
            </div>

            {permission === 'denied' && (
              <p className="text-xs text-red-500">
                Notification permission is blocked in your browser. Please reset the site settings permission to re-enable alerts.
              </p>
            )}

            <div>
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
                  className="gap-2 bg-wa-green hover:bg-wa-green/80 text-black font-semibold"
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
