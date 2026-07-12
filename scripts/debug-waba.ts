/**
 * Discover WABA linked to phone + what the token can access.
 * Usage: npx tsx scripts/debug-waba.ts
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

async function getJson(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  return { status: res.status, body: await res.json() }
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
  const phoneId = config.phone_number_id as string
  const wabaId = config.waba_id as string

  console.log('Stored phone_number_id:', phoneId)
  console.log('Stored waba_id:', wabaId)

  console.log('\n=== Phone details ===')
  console.log(JSON.stringify(await getJson(
    `https://graph.facebook.com/v21.0/${phoneId}?fields=id,display_phone_number,verified_name`,
    token,
  ), null, 2))

  console.log('\n=== Debug token ===')
  console.log(JSON.stringify(await getJson(
    `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(token)}`,
    token,
  ), null, 2))

  console.log('\n=== me/businesses ===')
  console.log(JSON.stringify(await getJson(
    'https://graph.facebook.com/v21.0/me/businesses?fields=id,name',
    token,
  ), null, 2))

  // For each business, list owned WABAs
  const bizRes = await getJson(
    'https://graph.facebook.com/v21.0/me/businesses?fields=id,name',
    token,
  )
  const businesses = (bizRes.body as { data?: { id: string; name: string }[] }).data ?? []
  for (const b of businesses) {
    console.log(`\n=== WABAs for business ${b.name} (${b.id}) ===`)
    const owned = await getJson(
      `https://graph.facebook.com/v21.0/${b.id}/owned_whatsapp_business_accounts?fields=id,name,account_review_status,message_template_namespace`,
      token,
    )
    console.log('owned:', JSON.stringify(owned, null, 2))
    const client = await getJson(
      `https://graph.facebook.com/v21.0/${b.id}/client_whatsapp_business_accounts?fields=id,name`,
      token,
    )
    console.log('client:', JSON.stringify(client, null, 2))

    const wabas = [
      ...((owned.body as { data?: { id: string; name: string }[] }).data ?? []),
      ...((client.body as { data?: { id: string; name: string }[] }).data ?? []),
    ]
    for (const w of wabas) {
      const tpls = await getJson(
        `https://graph.facebook.com/v21.0/${w.id}/message_templates?limit=100&fields=name,language,status,category`,
        token,
      )
      const list = (tpls.body as { data?: unknown[] }).data ?? []
      console.log(`\nTemplates under WABA ${w.name} (${w.id}): ${list.length}`)
      console.log(JSON.stringify(list, null, 2))
    }
  }

  // Also try stored WABA again with status filter none
  console.log('\n=== Stored WABA templates (all statuses via API) ===')
  console.log(JSON.stringify(await getJson(
    `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100&fields=name,language,status,category,quality_score`,
    token,
  ), null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
