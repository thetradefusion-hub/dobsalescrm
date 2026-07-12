/**
 * Dump Meta template components (for diagnosing #132012).
 * Usage: npx tsx scripts/debug-template-components.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '../src/lib/whatsapp/encryption'

const root = path.dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(path.join(root, '..', '.env.local'), 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

async function main() {
  const env = loadEnv()
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v
  }
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: config } = await db.from('whatsapp_config').select('*').limit(1).single()
  if (!config) throw new Error('no config')
  const token = decrypt(config.access_token)

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${config.waba_id}/message_templates?limit=100&fields=name,language,status,category,parameter_format,components`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const body = await res.json()
  console.log('Meta templates:')
  for (const t of body.data ?? []) {
    console.log('\n====', t.name, t.language, t.status, 'param_format=', t.parameter_format)
    console.log(JSON.stringify(t.components, null, 2))
  }

  const { data: local } = await db
    .from('message_templates')
    .select('name, language, status, header_type, header_content, body_text')
    .eq('user_id', config.user_id)
  console.log('\nLocal rows:', JSON.stringify(local, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
