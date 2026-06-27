/** Shared Supabase public config — browser + middleware safe. */

export function getSupabasePublicConfig():
  | { url: string; anonKey: string }
  | { error: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    return {
      error:
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them in .env.local (local) or Vercel → Settings → Environment Variables (production).',
    }
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { error: 'NEXT_PUBLIC_SUPABASE_URL must start with https://' }
    }
    if (!parsed.hostname.endsWith('.supabase.co')) {
      return {
        error:
          'NEXT_PUBLIC_SUPABASE_URL should look like https://YOUR-PROJECT-REF.supabase.co',
      }
    }
  } catch {
    return { error: 'NEXT_PUBLIC_SUPABASE_URL is not a valid URL.' }
  }

  return { url, anonKey }
}

export function isSupabaseConfigError(
  config: ReturnType<typeof getSupabasePublicConfig>,
): config is { error: string } {
  return 'error' in config
}
