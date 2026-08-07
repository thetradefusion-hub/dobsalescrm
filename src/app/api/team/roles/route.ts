import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import {
  PERMISSIONS,
  type PermissionKey,
} from '@/lib/auth/permissions'

async function requireRolesAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, account_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }) }
  }

  const isAdmin =
    profile.role === 'admin' || profile.account_id === profile.user_id
  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { profile }
}

export async function GET() {
  const auth = await requireRolesAdmin()
  if ('error' in auth && auth.error) return auth.error
  const { profile } = auth as { profile: { account_id: string } }

  const admin = supabaseAdmin()
  const { data: roles, error } = await admin
    .from('roles')
    .select('id, name, slug, is_system, is_admin, description, account_id')
    .eq('account_id', profile.account_id)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const roleIds = (roles ?? []).map((r) => r.id)
  const { data: perms } = await admin
    .from('role_permissions')
    .select('role_id, permission_key')
    .in('role_id', roleIds.length ? roleIds : ['00000000-0000-0000-0000-000000000000'])

  const byRole = new Map<string, string[]>()
  for (const p of perms ?? []) {
    const list = byRole.get(p.role_id) ?? []
    list.push(p.permission_key)
    byRole.set(p.role_id, list)
  }

  return NextResponse.json({
    roles: (roles ?? []).map((r) => ({
      ...r,
      permissions: byRole.get(r.id) ?? [],
    })),
    catalog: PERMISSIONS,
  })
}

export async function POST(request: Request) {
  const auth = await requireRolesAdmin()
  if ('error' in auth && auth.error) return auth.error
  const { profile } = auth as { profile: { account_id: string } }

  const body = (await request.json()) as {
    name?: string
    slug?: string
    description?: string
    permissions?: string[]
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const slug =
    body.slug?.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_') ||
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

  if (!slug || slug === 'admin') {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { data: role, error } = await admin
    .from('roles')
    .insert({
      account_id: profile.account_id,
      name,
      slug,
      is_system: false,
      is_admin: false,
      description: body.description?.trim() || null,
    })
    .select('id, name, slug')
    .single()

  if (error || !role) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create role' },
      { status: 400 },
    )
  }

  const keys = (body.permissions ?? []).filter((k): k is PermissionKey =>
    (PERMISSIONS as readonly string[]).includes(k),
  )

  if (keys.length > 0) {
    await admin.from('role_permissions').insert(
      keys.map((permission_key) => ({
        role_id: role.id,
        permission_key,
      })),
    )
  }

  return NextResponse.json({ ok: true, role })
}

export async function PUT(request: Request) {
  const auth = await requireRolesAdmin()
  if ('error' in auth && auth.error) return auth.error
  const { profile } = auth as { profile: { account_id: string } }

  const body = (await request.json()) as {
    role_id?: string
    permissions?: string[]
  }

  if (!body.role_id) {
    return NextResponse.json({ error: 'role_id required' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { data: role } = await admin
    .from('roles')
    .select('id, is_admin, slug, account_id')
    .eq('id', body.role_id)
    .eq('account_id', profile.account_id)
    .maybeSingle()

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  if (role.is_admin || role.slug === 'admin') {
    return NextResponse.json(
      { error: 'Admin role permissions are locked' },
      { status: 400 },
    )
  }

  const keys = (body.permissions ?? []).filter((k): k is PermissionKey =>
    (PERMISSIONS as readonly string[]).includes(k),
  )

  await admin.from('role_permissions').delete().eq('role_id', role.id)
  if (keys.length > 0) {
    const { error } = await admin.from('role_permissions').insert(
      keys.map((permission_key) => ({
        role_id: role.id,
        permission_key,
      })),
    )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
