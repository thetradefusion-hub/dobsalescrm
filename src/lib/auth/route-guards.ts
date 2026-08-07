/**
 * Client-safe permission check for route prefixes.
 * Used by middleware after loading profile role permissions via cookie/header
 * is not available — middleware uses a lightweight DB lookup pattern via
 * supabase user + profiles.role for Phase 2.
 *
 * Full permission matrix is enforced in the dashboard shell + nav.
 * Middleware blocks obvious Admin-only areas for sales_executive role slug.
 */

export const ADMIN_ONLY_PATH_PREFIXES = [
  '/reports',
  '/broadcasts',
  '/automations',
] as const

/** Settings tabs SE may open without full settings.view */
export const SE_ALLOWED_SETTINGS_TABS = new Set([
  'profile',
  'password',
  'sessions',
  'notifications',
])
