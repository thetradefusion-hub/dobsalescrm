import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

/** Serves the Digital One Box icon for PWA / notification clients. */
export async function GET() {
  const file = await readFile(
    path.join(process.cwd(), 'public', 'icons', 'icon-512.png'),
  )
  return new NextResponse(file, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
