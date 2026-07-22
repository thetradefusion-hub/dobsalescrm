import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { cert, initializeApp, getApps } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

function loadEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

const env = loadEnv('.env.local')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: tokens, error } = await db
  .from('fcm_tokens')
  .select('id,user_id,token,updated_at')
  .order('updated_at', { ascending: false })

console.log('tokens_error', error)
console.log('token_count', tokens?.length ?? 0)

const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}

if (!tokens?.length) {
  console.log('NO_TOKENS')
  process.exit(0)
}

const res = await getMessaging().sendEachForMulticast({
  tokens: tokens.map((t) => t.token),
  data: {
    title: 'WACRM Debug',
    body: 'If you see this, FCM works. Minimize the browser tab.',
    conversationId: 'test',
    url: 'http://localhost:3000/inbox',
  },
  webpush: {
    headers: { Urgency: 'high', TTL: '86400' },
    fcmOptions: { link: 'http://localhost:3000/inbox' },
  },
})

console.log('success', res.successCount, 'failure', res.failureCount)
for (let i = 0; i < res.responses.length; i++) {
  const r = res.responses[i]
  if (r.error) {
    console.log('err', i, r.error.code, r.error.message)
    if (
      r.error.code === 'messaging/registration-token-not-registered' ||
      r.error.code === 'messaging/invalid-registration-token'
    ) {
      await db.from('fcm_tokens').delete().eq('id', tokens[i].id)
      console.log('deleted stale token', tokens[i].id)
    }
  } else {
    console.log('ok', i, r.messageId)
  }
}
