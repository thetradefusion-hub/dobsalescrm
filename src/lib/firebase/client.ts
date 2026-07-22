'use client'

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getMessaging,
  getToken,
  deleteToken,
  isSupported,
  onMessage,
  type Messaging,
  type MessagePayload,
} from 'firebase/messaging'
import { getFirebaseClientConfig, isFirebaseClientConfigured } from './config'

export const FCM_SW_PATH = '/firebase-messaging-sw.js'
export const FCM_TOKEN_STORAGE_KEY = 'wacrm_fcm_token'

let messagingInstance: Messaging | null = null

function getOrInitApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0]!
  return initializeApp(getFirebaseClientConfig())
}

export async function getFirebaseMessagingClient(): Promise<Messaging | null> {
  if (!isFirebaseClientConfigured()) return null
  if (!(await isSupported())) return null
  if (messagingInstance) return messagingInstance
  messagingInstance = getMessaging(getOrInitApp())
  return messagingInstance
}

/** Unregister stale workers (e.g. old /sw.js) then register FCM worker. */
export async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker is not available.')
  }

  const existing = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    existing.map(async (reg) => {
      const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || ''
      // Keep only the FCM worker; remove legacy /sw.js etc.
      if (scriptUrl && !scriptUrl.includes('firebase-messaging-sw.js')) {
        await reg.unregister()
      }
    }),
  )

  const registration = await navigator.serviceWorker.register(FCM_SW_PATH, {
    scope: '/',
    updateViaCache: 'none',
  })

  await registration.update()
  await navigator.serviceWorker.ready

  // Wait until the FCM worker controls this page (needed for reliable push)
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      const onChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onChange)
        resolve()
      }
      navigator.serviceWorker.addEventListener('controllerchange', onChange)
      // Don't hang forever
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', onChange)
        resolve()
      }, 3000)
    })
  }

  return registration
}

export async function requestFcmToken(): Promise<string> {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase is not configured. Add Firebase env variables.')
  }
  if (!(await isSupported())) {
    throw new Error('Push notifications are not supported in this browser.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied.')
  }

  const registration = await registerFcmServiceWorker()
  const messaging = await getFirebaseMessagingClient()
  if (!messaging) {
    throw new Error('Could not initialize Firebase Messaging.')
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.')
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })

  if (!token) {
    throw new Error('Failed to obtain FCM token.')
  }

  return token
}

export async function removeFcmToken(): Promise<void> {
  const messaging = await getFirebaseMessagingClient()
  if (!messaging) return
  try {
    await deleteToken(messaging)
  } catch {
    // ignore
  }
}

export async function setupForegroundMessaging(
  onPayload: (payload: MessagePayload) => void,
): Promise<(() => void) | null> {
  // Ensure SW is registered before listening
  try {
    await registerFcmServiceWorker()
  } catch {
    // continue; onMessage can still work
  }
  const messaging = await getFirebaseMessagingClient()
  if (!messaging) return null
  return onMessage(messaging, onPayload)
}
