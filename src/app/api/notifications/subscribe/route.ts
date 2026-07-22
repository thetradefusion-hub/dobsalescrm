import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const token = body?.fcm_token as string | undefined
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'fcm_token is required' }, { status: 400 })
  }

  const deviceLabel =
    typeof body?.device_label === 'string' ? body.device_label.slice(0, 200) : null

  const { error } = await supabase.from('fcm_tokens').upsert(
    {
      user_id: user.id,
      token,
      device_label: deviceLabel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  )

  if (error) {
    console.error('[fcm subscribe] save failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const token = body?.fcm_token as string | undefined
  if (!token) {
    return NextResponse.json({ error: 'fcm_token is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('fcm_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('token', token)

  if (error) {
    console.error('[fcm subscribe] delete failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
