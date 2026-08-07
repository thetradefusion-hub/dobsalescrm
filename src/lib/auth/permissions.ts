/**
 * Permission catalog — single source of truth for RBAC UI + route gates.
 * Admin role uses sentinel '*' (all permissions).
 * WhatsApp send/webhook engines are NOT gated here; only app UI/routes.
 */

export const PERMISSIONS = [
  // Dashboard
  'dashboard.view',
  'dashboard.team',
  // Leads
  'leads.view_all',
  'leads.view_assigned',
  'leads.create',
  'leads.edit_assigned',
  'leads.delete',
  'leads.assign',
  'leads.transfer',
  'leads.import',
  'leads.export',
  // Deals
  'deals.view_all',
  'deals.view_assigned',
  'deals.edit_assigned',
  'deals.delete',
  'deals.transfer',
  // Contacts
  'contacts.view_all',
  'contacts.view_assigned',
  'contacts.create',
  'contacts.edit',
  // Tasks / calendar
  'tasks.view_all',
  'tasks.view_assigned',
  'tasks.create',
  'tasks.edit',
  'tasks.assign',
  'calendar.view_team',
  'calendar.view_own',
  // WhatsApp
  'whatsapp.inbox_all',
  'whatsapp.inbox_assigned',
  'whatsapp.send',
  'whatsapp.broadcast',
  'whatsapp.automation',
  'whatsapp.templates',
  'whatsapp.own_number',
  'whatsapp.manage_shared_config',
  // Reports / settings / team
  'reports.view',
  'revenue.view',
  'settings.view',
  'settings.profile',
  'team.manage',
  'roles.manage',
] as const

export type PermissionKey = (typeof PERMISSIONS)[number]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'dashboard.view': 'View dashboard',
  'dashboard.team': 'View team KPIs',
  'leads.view_all': 'View all leads',
  'leads.view_assigned': 'View assigned leads',
  'leads.create': 'Create leads',
  'leads.edit_assigned': 'Edit assigned leads',
  'leads.delete': 'Delete leads',
  'leads.assign': 'Assign leads',
  'leads.transfer': 'Transfer leads',
  'leads.import': 'Import leads',
  'leads.export': 'Export leads',
  'deals.view_all': 'View all deals',
  'deals.view_assigned': 'View assigned deals',
  'deals.edit_assigned': 'Edit assigned deals',
  'deals.delete': 'Delete deals',
  'deals.transfer': 'Transfer deals',
  'contacts.view_all': 'View all contacts',
  'contacts.view_assigned': 'View assigned contacts',
  'contacts.create': 'Create contacts',
  'contacts.edit': 'Edit contacts',
  'tasks.view_all': 'View all tasks',
  'tasks.view_assigned': 'View assigned tasks',
  'tasks.create': 'Create tasks',
  'tasks.edit': 'Edit tasks',
  'tasks.assign': 'Assign tasks',
  'calendar.view_team': 'View team calendar',
  'calendar.view_own': 'View own calendar',
  'whatsapp.inbox_all': 'View all WhatsApp chats',
  'whatsapp.inbox_assigned': 'View assigned chats',
  'whatsapp.send': 'Send WhatsApp messages',
  'whatsapp.broadcast': 'Broadcasts',
  'whatsapp.automation': 'Automations',
  'whatsapp.templates': 'Templates',
  'whatsapp.own_number': 'Connect own WhatsApp number',
  'whatsapp.manage_shared_config': 'Manage company WhatsApp',
  'reports.view': 'View reports',
  'revenue.view': 'View revenue',
  'settings.view': 'Full settings',
  'settings.profile': 'Edit own profile',
  'team.manage': 'Manage team members',
  'roles.manage': 'Manage roles & permissions',
}

/** Default SE template (mirrors DB seed). */
export const SALES_EXECUTIVE_DEFAULT_PERMISSIONS: PermissionKey[] = [
  'dashboard.view',
  'leads.view_assigned',
  'leads.create',
  'leads.edit_assigned',
  'deals.view_assigned',
  'deals.edit_assigned',
  'contacts.view_assigned',
  'contacts.create',
  'contacts.edit',
  'tasks.view_assigned',
  'tasks.create',
  'tasks.edit',
  'calendar.view_own',
  'whatsapp.inbox_assigned',
  'whatsapp.send',
  'settings.profile',
]

export function hasPermission(
  permissions: readonly string[] | null | undefined,
  key: PermissionKey | string,
): boolean {
  if (!permissions || permissions.length === 0) return false
  if (permissions.includes('*')) return true
  return permissions.includes(key)
}

export function hasAnyPermission(
  permissions: readonly string[] | null | undefined,
  keys: readonly PermissionKey[],
): boolean {
  return keys.some((k) => hasPermission(permissions, k))
}

/** Routes that require at least one of these permissions. */
export const ROUTE_PERMISSIONS: {
  prefix: string
  anyOf: PermissionKey[]
}[] = [
  { prefix: '/reports', anyOf: ['reports.view', 'revenue.view'] },
  { prefix: '/broadcasts', anyOf: ['whatsapp.broadcast'] },
  { prefix: '/automations', anyOf: ['whatsapp.automation'] },
  {
    prefix: '/settings',
    anyOf: [
      'settings.view',
      'settings.profile',
      'whatsapp.manage_shared_config',
      'whatsapp.own_number',
      'team.manage',
      'roles.manage',
    ],
  },
]
