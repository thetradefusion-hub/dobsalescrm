/**
 * Create template-media bucket on the .env.local Supabase project.
 * Usage: npx tsx scripts/ensure-template-media-bucket.ts
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
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase URL / service role key')

  console.log('Project:', url)
  const db = createClient(url, key)

  const { data: buckets, error: listErr } = await db.storage.listBuckets()
  if (listErr) throw new Error(`listBuckets: ${listErr.message}`)
  console.log('Existing buckets:', buckets?.map((b) => b.id).join(', ') || '(none)')

  if (buckets?.some((b) => b.id === 'template-media')) {
    console.log('Bucket template-media already exists')
    return
  }

  const { error } = await db.storage.createBucket('template-media', {
    public: true,
    fileSizeLimit: 16777216,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/3gpp',
      'application/pdf',
    ],
  })
  if (error) throw new Error(`createBucket: ${error.message}`)
  console.log('Created bucket: template-media')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
