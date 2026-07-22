import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
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
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: users } = await db.auth.admin.listUsers({ perPage: 20 })
  console.log('=== AUTH USERS ===')
  for (const u of users?.users ?? []) {
    console.log(u.id, u.email)
  }
  console.log('SEED_USER_ID env:', env.SEED_USER_ID ?? '(not set)')

  const { data: demoContacts } = await db
    .from('contacts')
    .select('id, name, phone, user_id')
    .like('phone', '+91990000000%')

  console.log('\n=== DEMO CONTACTS ===', demoContacts?.length ?? 0)
  demoContacts?.forEach((c) =>
    console.log(c.name, c.phone, 'user_id=', c.user_id),
  )

  const { data: allOpenDeals } = await db
    .from('deals')
    .select('id, title, status, user_id, contact_id, follow_up_at')
    .eq('status', 'open')

  console.log('\n=== ALL OPEN DEALS ===', allOpenDeals?.length ?? 0)
  allOpenDeals?.forEach((d) => console.log(d.title, 'user_id=', d.user_id))

  const LEAD_SELECT =
    '*, contact:contacts(*), stage:pipeline_stages(*), assignee:profiles!deals_assigned_to_fkey(*)'

  for (const u of users?.users ?? []) {
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    // Can't easily impersonate - use admin with filter
    const { data, error, count } = await db
      .from('deals')
      .select(LEAD_SELECT, { count: 'exact' })
      .eq('status', 'open')
      .eq('user_id', u.id)
      .limit(5)

    console.log(`\n=== LEADS QUERY for ${u.email} ===`)
    if (error) console.log('ERROR:', error.message)
    else console.log('count:', count, 'rows:', data?.length)
  }
}

main().catch(console.error)
