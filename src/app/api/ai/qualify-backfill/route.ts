import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { backfillLeadQualification } from '@/lib/ai/lead-backfill'

/**
 * POST /api/ai/qualify-backfill — re-qualify all existing conversations.
 * Body: { limit?: number, send_hot_alerts?: boolean }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const limit =
    typeof body.limit === 'number' && body.limit > 0
      ? Math.min(500, Math.floor(body.limit))
      : undefined
  const sendHotAlerts = !!body.send_hot_alerts

  try {
    const result = await backfillLeadQualification(user.id, {
      limit,
      skipHotActions: !sendHotAlerts,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backfill failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
