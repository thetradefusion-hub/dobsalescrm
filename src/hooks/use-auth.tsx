'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { profileIsAdmin } from '@/lib/auth/roles'

export interface AuthProfile {
  id: string
  user_id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: string | null
  account_id: string | null
  role_id: string | null
  permissions: string[]
  isAdmin: boolean
}

interface AuthContextValue {
  user: User | null
  profile: AuthProfile | null
  loading: boolean
  permissions: string[]
  isAdmin: boolean
  signOut: () => Promise<void>
  /** Re-fetch the current user's profile row — call after a save from
   *  the settings form so header/sidebar reflect the change without a
   *  full page reload. */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadPermissions(
  supabase: ReturnType<typeof createClient>,
  roleId: string | null,
  isAdmin: boolean,
): Promise<string[]> {
  if (isAdmin) return ['*']
  if (!roleId) return []
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission_key')
    .eq('role_id', roleId)
  if (error) {
    console.error('[AuthProvider] role_permissions error:', error.message)
    return []
  }
  return (data ?? []).map((r) => r.permission_key as string)
}

/**
 * AuthProvider — wrap this around the dashboard layout.
 * Makes ONE getSession() call for the whole tree instead of one per
 * component, avoiding internal lock contention in the Supabase client.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, user_id, full_name, email, avatar_url, role, account_id, role_id',
        )
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('[AuthProvider] fetchProfile error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        return
      }

      if (!data) return

      const isAdmin = profileIsAdmin({
        role: data.role,
        account_id: data.account_id,
        user_id: data.user_id,
      })
      const permissions = await loadPermissions(
        supabase,
        data.role_id,
        isAdmin,
      )

      setProfile({
        id: data.id,
        user_id: data.user_id,
        full_name: data.full_name,
        email: data.email,
        avatar_url: data.avatar_url,
        role: data.role,
        account_id: data.account_id,
        role_id: data.role_id,
        permissions,
        isAdmin,
      })
    } catch (err) {
      console.error('[AuthProvider] fetchProfile threw:', err)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn('[AuthProvider] getSession() timed out after 3s')
        setLoading(false)
      }
    }, 3000)

    const init = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error)
          console.error('[AuthProvider] getSession error:', error.message)

        if (!mounted) return
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          fetchProfile(currentUser.id)
        }
      } catch (err) {
        console.error('[AuthProvider] init threw:', err)
      } finally {
        if (mounted) setLoading(false)
        clearTimeout(safetyTimer)
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.href = '/login'
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    await fetchProfile(user.id)
  }, [user?.id, fetchProfile])

  const permissions = profile?.permissions ?? []
  const isAdmin = profile?.isAdmin ?? false

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        permissions,
        isAdmin,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth — read the shared auth state from context.
 * Must be used inside an <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    return {
      user: null,
      profile: null,
      loading: false,
      permissions: [],
      isAdmin: false,
      signOut: async () => {
        window.location.href = '/login'
      },
      refreshProfile: async () => {},
    }
  }
  return ctx
}
