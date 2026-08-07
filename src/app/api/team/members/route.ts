import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'

async function requireAccountAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, account_id, role, role_id')
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

  return { supabase, user, profile }
}

/** List team members in the current account. */
export async function GET() {
  const auth = await requireAccountAdmin()
  if ('error' in auth && auth.error) return auth.error

  const { profile } = auth as {
    profile: { account_id: string }
  }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('profiles')
    .select('id, user_id, full_name, email, role, role_id, created_at')
    .eq('account_id', profile.account_id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ members: data ?? [] })
}

/**
 * Create a Sales Executive (or role slug) under the Admin account.
 * Uses service role for auth.admin.createUser — does not touch WhatsApp/AI.
 */
export async function POST(request: Request) {
  const auth = await requireAccountAdmin()
  if ('error' in auth && auth.error) return auth.error

  const { profile } = auth as {
    profile: { account_id: string; user_id: string }
  }

  const body = (await request.json()) as {
    email?: string
    password?: string
    full_name?: string
    role_slug?: string
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ''
  const fullName = body.full_name?.trim() || email || 'Team member'
  const roleSlug = body.role_slug?.trim() || 'sales_executive'

  if (!email || password.length < 6) {
    return NextResponse.json(
      { error: 'Valid email and password (min 6) are required' },
      { status: 400 },
    )
  }

  if (roleSlug === 'admin') {
    return NextResponse.json(
      { error: 'Cannot create another Admin via this endpoint' },
      { status: 400 },
    )
  }

  const admin = supabaseAdmin()

  const { data: roleRow, error: roleErr } = await admin
    .from('roles')
    .select('id, slug')
    .eq('account_id', profile.account_id)
    .eq('slug', roleSlug)
    .maybeSingle()

  if (roleErr || !roleRow) {
    return NextResponse.json(
      { error: `Role "${roleSlug}" not found for this account` },
      { status: 400 },
    )
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message || 'Failed to create user' },
      { status: 400 },
    )
  }

  const newUserId = created.user.id

  // handle_new_user trigger may have created an Admin profile for a new account.
  // Re-home this user into the Admin's account as SE.
  const { error: upsertErr } = await admin.from('profiles').upsert(
    {
      user_id: newUserId,
      full_name: fullName,
      email,
      role: roleSlug,
      account_id: profile.account_id,
      role_id: roleRow.id,
    },
    { onConflict: 'user_id' },
  )

  if (upsertErr) {
    // Best-effort cleanup
    await admin.auth.admin.deleteUser(newUserId)
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  // Remove accidental account-scoped roles created by trigger for this user id
  await admin
    .from('roles')
    .delete()
    .eq('account_id', newUserId)

  return NextResponse.json({
    ok: true,
    member: {
      user_id: newUserId,
      email,
      full_name: fullName,
      role: roleSlug,
    },
  })
}
