/**
 * Debug: list Meta message templates for the stored WABA.
 * Usage: npx tsx scripts/debug-meta-templates.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '../src/lib/whatsapp/encryption'

const root = path.dirname(fileURLToPath(import.meta.url))

function loadEnv(): Record<string, string> {
  const envPath = path.join(root, '..', '.env.local')
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
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
  const { data: config, error } = await db.from('whatsapp_config').select('*').limit(1).single()
  if (error || !config) {
    console.error('No config:', error?.message)
    process.exit(1)
  }

  console.log('phone_number_id:', config.phone_number_id)
  console.log('waba_id:', config.waba_id || '(MISSING)')

  const token = decrypt(config.access_token)
  console.log('token prefix:', token.slice(0, 10) + '...')

  // Verify token / phone
  const phoneRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}?fields=id,display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const phoneBody = await phoneRes.json()
  console.log('\nPhone verify:', phoneRes.status, JSON.stringify(phoneBody, null, 2))

  if (!config.waba_id) {
    console.error('\nWABA ID missing — Sync from Meta cannot fetch templates.')
    process.exit(1)
  }

  // Fetch templates
  const url = `https://graph.facebook.com/v21.0/${config.waba_id}/message_templates?limit=100&fields=id,name,language,status,category`
  const tplRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const tplBody = await tplRes.json()
  console.log('\nTemplates API status:', tplRes.status)
  if (!tplRes.ok) {
    console.error('Meta error:', JSON.stringify(tplBody, null, 2))
    process.exit(1)
  }

  const list = tplBody.data ?? []
  console.log('Total from Meta:', list.length)
  for (const t of list) {
    console.log(` - ${t.name} | ${t.language} | ${t.status} | ${t.category}`)
  }

  // Local DB templates
  const { data: local } = await db
    .from('message_templates')
    .select('name, language, status, category')
    .eq('user_id', config.user_id)
    .order('name')
  console.log('\nLocal DB templates:', local?.length ?? 0)
  for (const t of local ?? []) {
    console.log(` - ${t.name} | ${t.language} | ${t.status} | ${t.category}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
