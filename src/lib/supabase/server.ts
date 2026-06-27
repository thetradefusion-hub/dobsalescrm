import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  getSupabasePublicConfig,
  isSupabaseConfigError,
} from '@/lib/supabase/config'

export async function createClient() {
  const config = getSupabasePublicConfig()
  if (isSupabaseConfigError(config)) {
    throw new Error(config.error)
  }

  const cookieStore = await cookies()

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  })
}
