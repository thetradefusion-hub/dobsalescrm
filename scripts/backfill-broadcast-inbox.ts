/**
 * Backfill inbox messages for recent successful broadcasts that were
 * missing from chat history.
 * Usage: npx tsx scripts/backfill-broadcast-inbox.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { persistBroadcastMessageToInbox } from '../src/lib/broadcasts/persist-inbox'

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

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)

  // Latest uploaded template media (best-effort image for daily_krishi_update).
  let mediaUrl: string | null = null
  const { data: broadcasts } = await admin
    .from('broadcasts')
    .select('id, user_id, name, template_name, status, created_at')
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(5)

  const userId = broadcasts?.[0]?.user_id
  if (userId) {
    const { data: files } = await admin.storage
      .from('template-media')
      .list(userId, { limit: 20, sortBy: { column: 'created_at', order: 'desc' } })
    const newest = files?.[0]
    if (newest?.name) {
      const {
        data: { publicUrl },
      } = admin.storage.from('template-media').getPublicUrl(`${userId}/${newest.name}`)
      mediaUrl = publicUrl
      console.log('Using media:', mediaUrl)
    }
  }

  const { data: templates } = await admin
    .from('message_templates')
    .select('name, body_text, header_type')
    .eq('status', 'Approved')

  const bodyByName = new Map(
    (templates ?? []).map((t) => [t.name, t.body_text as string]),
  )

  let inserted = 0
  for (const b of broadcasts ?? []) {
    if (!['daily_krishi_update', 'hello_world'].includes(b.template_name)) continue

    const { data: recs } = await admin
      .from('broadcast_recipients')
      .select('whatsapp_message_id, status, contact_id, contact:contacts(id)')
      .eq('broadcast_id', b.id)
      .in('status', ['sent', 'delivered', 'read'])

    for (const r of recs ?? []) {
      const contactId =
        r.contact_id ||
        (r.contact as { id?: string } | null)?.id
      if (!contactId || !r.whatsapp_message_id) continue

      const bodyText = bodyByName.get(b.template_name) ?? `[template:${b.template_name}]`
      const useMedia =
        b.template_name === 'daily_krishi_update' ? mediaUrl : null

      const result = await persistBroadcastMessageToInbox({
        admin,
        userId: b.user_id,
        contactId,
        templateName: b.template_name,
        bodyText,
        mediaUrl: useMedia,
        whatsappMessageId: r.whatsapp_message_id,
      })

      if ('error' in result) {
        console.error('Failed', b.name, contactId, result.error)
      } else {
        inserted++
        console.log('OK', b.name, '→ conversation', result.conversationId)
      }
    }
  }

  console.log(`Backfilled ${inserted} inbox message(s)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
