/**
 * Debug why broadcast messages aren't in inbox.
 * Usage: npx tsx scripts/debug-broadcast-inbox.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

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
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: broadcasts } = await db
    .from('broadcasts')
    .select('id, name, template_name, status, total_recipients, sent_count, failed_count, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('Recent broadcasts:')
  console.log(JSON.stringify(broadcasts, null, 2))

  for (const b of broadcasts ?? []) {
    const { data: recs } = await db
      .from('broadcast_recipients')
      .select('id, status, whatsapp_message_id, error_message, contact:contacts(id, name, phone)')
      .eq('broadcast_id', b.id)
      .limit(20)
    console.log(`\nRecipients for ${b.name} (${b.id}):`)
    console.log(JSON.stringify(recs, null, 2))

    for (const r of recs ?? []) {
      const contact = r.contact as { id?: string; name?: string; phone?: string } | null
      if (!contact?.id) continue
      const { data: conv } = await db
        .from('conversations')
        .select('id, last_message_text, last_message_at')
        .eq('contact_id', contact.id)
        .maybeSingle()
      console.log(`  contact ${contact.name} (${contact.phone}) conv=`, conv)

      if (conv?.id) {
        const { data: msgs } = await db
          .from('messages')
          .select('id, sender_type, content_type, content_text, media_url, template_name, message_id, status, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(8)
        console.log('  recent messages:', JSON.stringify(msgs, null, 2))
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
