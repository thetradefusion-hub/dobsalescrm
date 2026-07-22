import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'

let adminApp: App | null = null

export function getFirebaseAdminApp(): App | null {
  if (adminApp) return adminApp
  if (getApps().length > 0) {
    adminApp = getApps()[0]!
    return adminApp
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    return null
  }

  try {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    })
    return adminApp
  } catch (err) {
    console.error('[firebase-admin] init failed:', err)
    return null
  }
}

export function getFirebaseMessaging(): Messaging | null {
  const app = getFirebaseAdminApp()
  if (!app) return null
  return getMessaging(app)
}
