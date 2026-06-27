/**
 * Verify stored WhatsApp access token against Meta API.
 * Usage: npx tsx scripts/verify-whatsapp-token.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '../src/lib/whatsapp/encryption'
import { verifyPhoneNumber } from '../src/lib/whatsapp/meta-api'

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
    console.error('No whatsapp_config:', error?.message)
    process.exit(1)
  }

  console.log('phone_number_id:', config.phone_number_id)
  console.log('token encrypted length:', config.access_token?.length ?? 0)

  let token: string
  try {
    token = decrypt(config.access_token)
    console.log('decrypt: OK, token length:', token.length)
    console.log('token prefix:', token.slice(0, 8) + '...')
  } catch (e) {
    console.error('decrypt FAILED:', e instanceof Error ? e.message : e)
    console.error('Check WHATSAPP_ENCRYPTION_KEY in .env.local matches when token was saved.')
    process.exit(1)
  }

  try {
    const info = await verifyPhoneNumber({
      phoneNumberId: config.phone_number_id,
      accessToken: token,
    })
    console.log('\nMeta API verify: SUCCESS')
    console.log('display_phone_number:', info.display_phone_number)
    console.log('verified_name:', info.verified_name)
  } catch (e) {
    console.error('\nMeta API verify: FAILED')
    console.error(e instanceof Error ? e.message : e)
    console.error('\nFix: Settings → WhatsApp → paste a fresh System User / permanent access token from Meta Developer Console.')
    process.exit(1)
  }
}

main()
