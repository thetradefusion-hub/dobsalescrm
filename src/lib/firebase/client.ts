'use client'

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
  type MessagePayload,
} from 'firebase/messaging'
import { getFirebaseClientConfig, isFirebaseClientConfigured } from './config'

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

  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker is not available.')
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  })
  await navigator.serviceWorker.ready

  const messaging = await getFirebaseMessagingClient()
  if (!messaging) {
    throw new Error('Could not initialize Firebase Messaging.')
  }

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })

  if (!token) {
    throw new Error('Failed to obtain FCM token.')
  }

  return token
}

export async function setupForegroundMessaging(
  onPayload: (payload: MessagePayload) => void,
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessagingClient()
  if (!messaging) return null
  return onMessage(messaging, onPayload)
}
