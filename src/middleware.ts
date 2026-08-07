import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getSupabasePublicConfig,
  isSupabaseConfigError,
} from '@/lib/supabase/config'
import { ADMIN_ONLY_PATH_PREFIXES } from '@/lib/auth/route-guards'

const AUTH_PAGES = ['/login', '/signup', '/forgot-password']
const PROTECTED_PATHS = [
  '/dashboard',
  '/inbox',
  '/contacts',
  '/leads',
  '/reports',
  '/pipelines',
  '/broadcasts',
  '/automations',
  '/settings',
  '/tasks',
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

function isAdminProfile(profile: {
  role: string | null
  account_id: string | null
  user_id: string
} | null): boolean {
  if (!profile) return true
  if (profile.role === 'admin') return true
  if (profile.account_id && profile.account_id === profile.user_id) return true
  return false
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

  // Phase 2 role gate — does not alter WhatsApp webhook/send handlers.
  if (user) {
    const tab = request.nextUrl.searchParams.get('tab')
    const adminSettingsTab =
      pathname.startsWith('/settings') &&
      (tab === 'ai' ||
        tab === 'templates' ||
        tab === 'tags' ||
        tab === 'team' ||
        tab === 'roles')
    const adminOnlyPath = ADMIN_ONLY_PATH_PREFIXES.some((p) =>
      pathname.startsWith(p),
    )

    if (adminOnlyPath || adminSettingsTab) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, account_id, user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!isAdminProfile(profile)) {
        if (pathname.startsWith('/settings')) {
          const url = request.nextUrl.clone()
          url.pathname = '/settings'
          url.searchParams.set('tab', 'profile')
          return NextResponse.redirect(url)
        }
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|pwa-icon|manifest.json|sw.js|firebase-messaging-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
