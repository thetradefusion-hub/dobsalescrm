/**
 * Inspect recent automation logs and active ARH automations.
 * Usage: npx tsx scripts/debug-automation-logs.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

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
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')

  const db = createClient(url, key)

  const { data: configs } = await db.from('whatsapp_config').select('user_id, phone_number_id')
  console.log('WhatsApp configs:', configs)

  const { data: activeCount } = await db
    .from('automations')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .ilike('name', 'ARH | %')
  console.log('Active ARH automations:', activeCount)

  const { data: greet } = await db
    .from('automations')
    .select('id, name, is_active, execution_count, user_id')
    .ilike('name', '%Greeting%Main Menu%')
    .limit(3)
  console.log('\nGreeting automation:', greet)

  const { data: logs } = await db
    .from('automation_logs')
    .select('id, status, error_message, trigger_event, created_at, steps_executed, automation_id')
    .order('created_at', { ascending: false })
    .limit(20)

  console.log('\nRecent automation logs:')
  for (const l of logs ?? []) {
    const { data: auto } = await db
      .from('automations')
      .select('name')
      .eq('id', l.automation_id)
      .maybeSingle()
    const failed = (l.steps_executed as { status: string; detail?: string; step_type?: string }[] | null)?.find(
      (s) => s.status === 'failed',
    )
    console.log(
      l.created_at,
      '|',
      l.status,
      '|',
      l.trigger_event,
      '|',
      auto?.name ?? l.automation_id,
    )
    if (l.error_message) console.log('  error:', l.error_message)
    if (failed) console.log('  failed step:', failed.step_type, failed.detail)
  }

  const { data: failed } = await db
    .from('automation_logs')
    .select('error_message, steps_executed, automation_id, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(10)

  console.log('\n--- Recent failures summary ---')
  for (const f of failed ?? []) {
    const { data: auto } = await db.from('automations').select('name').eq('id', f.automation_id).maybeSingle()
    const failedStep = (f.steps_executed as { step_type?: string; detail?: string; status: string }[] | null)?.find(
      (s) => s.status === 'failed',
    )
    console.log(f.created_at, auto?.name)
    console.log(' ', f.error_message ?? failedStep?.detail)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
