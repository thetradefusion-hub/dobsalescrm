import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export const runtime = 'nodejs'

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/3gpp',
  'application/pdf',
])

const MAX_BYTES = 16 * 1024 * 1024

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

/**
 * Upload template header media with the service-role client so we don't
 * depend on storage RLS policies existing on every environment.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || 'unknown'}` },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large (max 16 MB)' },
        { status: 400 },
      )
    }

    const admin = supabaseAdmin()

    // Ensure bucket exists (idempotent).
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.some((b) => b.id === 'template-media')) {
      const { error: createErr } = await admin.storage.createBucket(
        'template-media',
        {
          public: true,
          fileSizeLimit: MAX_BYTES,
          allowedMimeTypes: [...ALLOWED],
        },
      )
      if (createErr && !/already exists/i.test(createErr.message)) {
        return NextResponse.json(
          { error: `Could not create storage bucket: ${createErr.message}` },
          { status: 500 },
        )
      }
    }

    const ext =
      file.name.split('.').pop()?.toLowerCase() ||
      (file.type.startsWith('image/')
        ? 'jpg'
        : file.type.startsWith('video/')
          ? 'mp4'
          : 'pdf')
    const path = `${user.id}/${Date.now()}-${sanitizeFilename(file.name) || `header.${ext}`}`
    const bytes = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from('template-media')
      .upload(path, bytes, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 },
      )
    }

    const {
      data: { publicUrl },
    } = admin.storage.from('template-media').getPublicUrl(path)

    return NextResponse.json({ success: true, url: publicUrl, path })
  } catch (error) {
    console.error('[template-media] upload failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to upload media',
      },
      { status: 500 },
    )
  }
}
