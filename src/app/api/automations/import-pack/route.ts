import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importAutomationPack, type PackSlug } from '@/lib/automations/import-pack'
import { getAnandRadioHousePack } from '@/lib/automations/packs/anand-radio-house'

const VALID_PACKS: PackSlug[] = ['anand_radio_house']

export async function GET() {
  const pack = getAnandRadioHousePack()
  return NextResponse.json({
    packs: [
      {
        slug: pack.slug,
        title: pack.title,
        description: pack.description,
        automationCount: pack.automationCount,
      },
    ],
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const pack = body?.pack as PackSlug | undefined
  const replace = !!body?.replace

  if (!pack || !VALID_PACKS.includes(pack)) {
    return NextResponse.json({ error: 'Invalid pack slug' }, { status: 400 })
  }

  const result = await importAutomationPack(user.id, pack, { replace })

  if (result.created === 0 && result.errors.length > 0 && result.skipped === 0) {
    return NextResponse.json(
      { error: 'Import failed', ...result },
      { status: 400 },
    )
  }

  return NextResponse.json(result, { status: 201 })
}
