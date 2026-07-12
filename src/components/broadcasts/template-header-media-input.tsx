'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Link2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type HeaderMediaKind = 'image' | 'video' | 'document'

interface TemplateHeaderMediaInputProps {
  mediaType: HeaderMediaKind
  value: string
  onChange: (url: string) => void
  className?: string
}

const ACCEPT: Record<HeaderMediaKind, string> = {
  image: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4,video/3gpp',
  document: 'application/pdf',
}

const MAX_BYTES: Record<HeaderMediaKind, number> = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  document: 16 * 1024 * 1024,
}

/**
 * Upload-or-paste control for WhatsApp template HEADER media.
 * Uploads via /api/whatsapp/template-media (service role) so the
 * public HTTPS URL Meta needs is always available.
 */
export function TemplateHeaderMediaInput({
  mediaType,
  value,
  onChange,
  className,
}: TemplateHeaderMediaInputProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showUrl, setShowUrl] = useState(false)

  async function handleFile(file: File | null) {
    if (!file) return

    if (file.size > MAX_BYTES[mediaType]) {
      toast.error(
        `File too large. Max ${Math.round(MAX_BYTES[mediaType] / (1024 * 1024))} MB for ${mediaType}.`,
      )
      return
    }

    const allowed = ACCEPT[mediaType].split(',')
    if (!allowed.includes(file.type)) {
      toast.error(`Unsupported file type for ${mediaType} header.`)
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/whatsapp/template-media', {
        method: 'POST',
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `Upload failed (HTTP ${res.status})`)
      }
      if (!data?.url) throw new Error('Upload succeeded but no URL returned')
      onChange(data.url as string)
      toast.success('Media uploaded')
    } catch (err) {
      console.error('Template media upload failed:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload media',
      )
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const isHttps = /^https:\/\/.+/i.test(value.trim())

  return (
    <div className={className ?? 'space-y-2 rounded-xl border border-wa-border bg-wa-panel/50 p-4'}>
      <p className="text-sm font-medium text-wa-text">
        Header {mediaType}
      </p>
      <p className="text-xs text-wa-muted">
        Upload a file, or paste a public HTTPS link. Meta needs this for
        IMAGE/VIDEO/DOCUMENT templates.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="border-wa-border text-wa-text/90"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploading ? 'Uploading…' : 'Upload file'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowUrl((v) => !v)}
          className="border-wa-border text-wa-text/90"
        >
          <Link2 className="h-4 w-4" />
          {showUrl ? 'Hide URL' : 'Paste URL'}
        </Button>
        {value.trim() && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange('')}
            className="border-wa-border text-wa-text/90"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT[mediaType]}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
      />

      {(showUrl || (value && !value.includes('/storage/v1/object/public/template-media/'))) && (
        <div className="space-y-1">
          <Label className="text-xs text-wa-muted">HTTPS URL</Label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`https://example.com/file.${mediaType === 'video' ? 'mp4' : mediaType === 'document' ? 'pdf' : 'jpg'}`}
            className="border-wa-border bg-wa-surface text-wa-text placeholder:text-wa-muted/80"
          />
        </div>
      )}

      {value.trim() && !isHttps && (
        <p className="text-xs text-red-500">
          URL must start with https://
        </p>
      )}

      {isHttps && mediaType === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.trim()}
          alt="Header preview"
          className="mt-1 max-h-48 rounded-lg border border-wa-border object-contain"
        />
      )}

      {isHttps && mediaType !== 'image' && (
        <p className="truncate text-xs text-wa-green">{value.trim()}</p>
      )}
    </div>
  )
}
