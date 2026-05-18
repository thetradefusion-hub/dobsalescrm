/**
 * Re-qualify all existing conversations (CLI).
 * Usage: npx tsx scripts/backfill-lead-qualification.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv(): Record<string, string> {
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) throw new Error('.env.local not found')
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
  }
  return env
}

async function main() {
  const env = loadEnv()
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  }

  const db = createClient(url, key)
  const { data: configs } = await db
    .from('ai_config')
    .select('user_id')
    .eq('lead_sync_enabled', true)
    .not('api_key_encrypted', 'is', null)
    .limit(1)

  const userId = configs?.[0]?.user_id ?? env.BACKFILL_USER_ID
  if (!userId) {
    throw new Error('Enable lead sync in Settings → AI, or set BACKFILL_USER_ID in .env.local')
  }

  console.log(`Qualifying conversations for user ${userId}…`)
  const { backfillLeadQualification } = await import('../src/lib/ai/lead-backfill')
  const result = await backfillLeadQualification(userId, { skipHotActions: true })
  console.log(JSON.stringify(result, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
