import type { PermissionKey } from '@/lib/auth/permissions'
import { hasPermission } from '@/lib/auth/permissions'

export type AppRoleSlug = 'admin' | 'sales_executive' | (string & {})

export interface AuthProfile {
  id: string
  user_id?: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: string | null
  account_id: string | null
  role_id: string | null
  permissions: string[]
  isAdmin: boolean
}

export function profileIsAdmin(profile: {
  role?: string | null
  account_id?: string | null
  user_id?: string | null
  isAdmin?: boolean
} | null): boolean {
  if (!profile) return false
  if (profile.isAdmin) return true
  if (profile.role === 'admin') return true
  if (
    profile.account_id &&
    profile.user_id &&
    profile.account_id === profile.user_id
  ) {
    return true
  }
  return false
}

export function canViewAllLeads(permissions: string[]): boolean {
  return hasPermission(permissions, 'leads.view_all')
}

export function canViewAllDeals(permissions: string[]): boolean {
  return hasPermission(permissions, 'deals.view_all')
}

export function canManageTeam(permissions: string[]): boolean {
  return hasPermission(permissions, 'team.manage')
}

export function canAccessSettingsFull(permissions: string[]): boolean {
  return hasPermission(permissions, 'settings.view')
}

export function permissionForNav(
  href: string,
  permissions: string[],
): boolean {
  if (hasPermission(permissions, '*')) return true

  if (href.startsWith('/dashboard')) {
    return hasPermission(permissions, 'dashboard.view')
  }
  if (href.startsWith('/leads')) {
    return (
      hasPermission(permissions, 'leads.view_all') ||
      hasPermission(permissions, 'leads.view_assigned')
    )
  }
  if (href.startsWith('/pipelines')) {
    return (
      hasPermission(permissions, 'deals.view_all') ||
      hasPermission(permissions, 'deals.view_assigned')
    )
  }
  if (href.startsWith('/inbox')) {
    return (
      hasPermission(permissions, 'whatsapp.inbox_all') ||
      hasPermission(permissions, 'whatsapp.inbox_assigned')
    )
  }
  if (href.startsWith('/tasks')) {
    return (
      hasPermission(permissions, 'tasks.view_all') ||
      hasPermission(permissions, 'tasks.view_assigned') ||
      hasPermission(permissions, 'calendar.view_own')
    )
  }
  if (href.startsWith('/contacts')) {
    return (
      hasPermission(permissions, 'contacts.view_all') ||
      hasPermission(permissions, 'contacts.view_assigned')
    )
  }
  if (href.startsWith('/broadcasts')) {
    return hasPermission(permissions, 'whatsapp.broadcast')
  }
  if (href.startsWith('/automations')) {
    return hasPermission(permissions, 'whatsapp.automation')
  }
  if (href.startsWith('/reports')) {
    return (
      hasPermission(permissions, 'reports.view') ||
      hasPermission(permissions, 'revenue.view')
    )
  }
  if (href.startsWith('/settings')) {
    const keys: PermissionKey[] = [
      'settings.view',
      'settings.profile',
      'team.manage',
      'roles.manage',
      'whatsapp.manage_shared_config',
      'whatsapp.own_number',
      'whatsapp.templates',
    ]
    return keys.some((k) => hasPermission(permissions, k))
  }
  return true
}
