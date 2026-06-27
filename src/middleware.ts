import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getSupabasePublicConfig,
  isSupabaseConfigError,
} from '@/lib/supabase/config'

const AUTH_PAGES = ['/login', '/signup', '/forgot-password']
const PROTECTED_PATHS = [
  '/dashboard',
  '/inbox',
  '/contacts',
  '/pipelines',
  '/broadcasts',
  '/automations',
  '/settings',
]

const AUTH_TIMEOUT_MS = 5000

async function getUserWithTimeout(
  supabase: ReturnType<typeof createServerClient>,
) {
  return Promise.race([
    supabase.auth.getUser(),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Supabase auth request timed out')),
        AUTH_TIMEOUT_MS,
      )
    }),
  ])
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const config = getSupabasePublicConfig()

  if (isSupabaseConfigError(config)) {
    console.error('[middleware] Supabase config:', config.error)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Server misconfigured: Supabase env vars missing.' },
        { status: 503 },
      )
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  let user = null
  try {
    const { data } = await getUserWithTimeout(supabase)
    user = data.user
  } catch (err) {
    console.error('[middleware] Supabase auth unavailable:', err)
    // Fail open on auth pages so login UI still loads when Supabase is down.
    if (AUTH_PAGES.includes(pathname)) {
      return supabaseResponse
    }
    if (PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'supabase_unreachable')
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (
    !user &&
    PROTECTED_PATHS.some((path) => pathname.startsWith(path))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (
    !user &&
    pathname.startsWith('/api/whatsapp/') &&
    !pathname.includes('/webhook')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|pwa-icon|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
