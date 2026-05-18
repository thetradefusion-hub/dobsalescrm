import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'
import { generateChatCompletion, type AiProvider } from '@/lib/ai/providers'

/**
 * POST /api/ai/test — send a sample prompt to verify API key + model.
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

  const body = await request.json().catch(() => null)
  const testMessage =
    typeof body?.message === 'string' && body.message.trim()
      ? body.message.trim()
      : 'Say hello in one short sentence.'

  const { data: config, error } = await supabase
    .from('ai_config')
    .select('provider, model, system_prompt, api_key_encrypted')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !config?.api_key_encrypted) {
    return NextResponse.json(
      { error: 'Save your AI configuration first' },
      { status: 400 },
    )
  }

  let apiKey: string
  try {
    apiKey = decrypt(config.api_key_encrypted)
  } catch {
    return NextResponse.json(
      { error: 'API key decryption failed — re-save your key' },
      { status: 400 },
    )
  }

  try {
    const reply = await generateChatCompletion({
      provider: config.provider as AiProvider,
      apiKey,
      model: config.model,
      messages: [
        {
          role: 'system',
          content: config.system_prompt || 'You are a helpful assistant.',
        },
        { role: 'user', content: testMessage },
      ],
    })
    return NextResponse.json({ ok: true, reply })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
