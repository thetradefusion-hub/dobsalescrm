import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getSupabasePublicConfig,
  isSupabaseConfigError,
} from '@/lib/supabase/config'

// Singleton instance — one client shared across the whole browser session.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  const config = getSupabasePublicConfig()
  if (isSupabaseConfigError(config)) {
    throw new Error(config.error)
  }

  browserClient = createBrowserClient(config.url, config.anonKey)

  return browserClient
}
