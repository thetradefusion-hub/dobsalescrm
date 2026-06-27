/**
 * Import Anand Radio House automation pack via service role.
 * Usage: npx tsx scripts/seed-anand-radio-house.ts [--replace]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { importAutomationPack } from '../src/lib/automations/import-pack'

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
  const replace = process.argv.includes('--replace')
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
  const userId = env.SEED_USER_ID

  let targetUserId = userId
  if (!targetUserId) {
    const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1 })
    targetUserId = users?.users?.[0]?.id
  }
  if (!targetUserId) {
    throw new Error('Set SEED_USER_ID in .env.local or create a user account first')
  }

  console.log(`Importing Anand Radio House pack for user ${targetUserId}...`)
  const result = await importAutomationPack(targetUserId, 'anand_radio_house', { replace })

  console.log(`Created: ${result.created}`)
  console.log(`Deleted (replace): ${result.deleted}`)
  console.log(`Skipped: ${result.skipped}`)
  if (result.errors.length) {
    console.error('Errors:', result.errors)
  }
  if (result.created > 0) {
    console.log('Done! Open http://localhost:3000/automations')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
