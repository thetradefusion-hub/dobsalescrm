import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env.local')

function loadEnv() {
  const env = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

const env = loadEnv()
const secret = env.META_APP_SECRET
if (!secret) {
  console.error('META_APP_SECRET missing in .env.local')
  process.exit(1)
}

const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
const sig =
  'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')

const res = await fetch('http://localhost:3000/api/whatsapp/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-hub-signature-256': sig,
  },
  body,
})

const text = await res.text()
console.log('Status:', res.status)
console.log('Body:', text)
process.exit(res.status === 200 ? 0 : 1)
