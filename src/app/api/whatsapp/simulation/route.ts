import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  resolveRealApiCap,
  resolveWhatsAppSimulation,
  WHATSAPP_REAL_CAP_COOKIE,
  WHATSAPP_SIMULATION_COOKIE,
} from '@/lib/whatsapp/simulation'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const cookieOpts = {
  path: '/',
  maxAge: COOKIE_MAX_AGE,
  sameSite: 'lax' as const,
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

function readSettings(jar: Awaited<ReturnType<typeof cookies>>) {
  const enabled = resolveWhatsAppSimulation(
    jar.get(WHATSAPP_SIMULATION_COOKIE)?.value,
  )
  const realCap = resolveRealApiCap(jar.get(WHATSAPP_REAL_CAP_COOKIE)?.value)
  return { enabled, realCap }
}

export async function GET() {
  const user = await requireUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jar = await cookies()
  return NextResponse.json(readSettings(jar))
}

export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { enabled?: unknown; realCap?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const jar = await cookies()
  const current = readSettings(jar)

  let enabled = current.enabled
  if (typeof body.enabled === 'boolean') {
    enabled = body.enabled
  }

  let realCap = current.realCap
  if ('realCap' in body) {
    if (body.realCap === null || body.realCap === '') {
      realCap = null
    } else if (typeof body.realCap === 'number' && Number.isFinite(body.realCap)) {
      realCap = Math.max(0, Math.floor(body.realCap))
    } else if (typeof body.realCap === 'string' && body.realCap.trim() !== '') {
      const n = Number.parseInt(body.realCap, 10)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { error: '`realCap` must be a non-negative integer or null' },
          { status: 400 },
        )
      }
      realCap = Math.floor(n)
    } else {
      return NextResponse.json(
        { error: '`realCap` must be a non-negative integer or null' },
        { status: 400 },
      )
    }
  }

  const response = NextResponse.json({ enabled, realCap })
  response.cookies.set(
    WHATSAPP_SIMULATION_COOKIE,
    enabled ? '1' : '0',
    cookieOpts,
  )
  if (realCap === null) {
    response.cookies.set(WHATSAPP_REAL_CAP_COOKIE, '', {
      ...cookieOpts,
      maxAge: 0,
    })
  } else {
    response.cookies.set(WHATSAPP_REAL_CAP_COOKIE, String(realCap), cookieOpts)
  }

  return response
}
