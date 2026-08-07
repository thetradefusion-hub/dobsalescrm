export type AiProvider = 'openai' | 'gemini'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateReplyInput {
  provider: AiProvider
  apiKey: string
  model: string
  messages: ChatMessage[]
  /** LLM temperature (default 0.7). Use ~0.2 for structured extraction. */
  temperature?: number
  /** Cap completion length (default 1024). Keep low for WhatsApp chat. */
  maxTokens?: number
}

const OPENAI_DEFAULT = 'gpt-4o-mini'
const GEMINI_DEFAULT = 'gemini-2.0-flash'

export function defaultModel(provider: AiProvider): string {
  return provider === 'gemini' ? GEMINI_DEFAULT : OPENAI_DEFAULT
}

export async function generateChatCompletion(input: GenerateReplyInput): Promise<string> {
  const model =
    input.model?.trim() ||
    defaultModel(input.provider)

  const temperature = input.temperature ?? 0.7
  const maxTokens = input.maxTokens ?? 1024
  if (input.provider === 'gemini') {
    return generateGemini(input.apiKey, model, input.messages, temperature, maxTokens)
  }
  return generateOpenAI(input.apiKey, model, input.messages, temperature, maxTokens)
}

async function generateOpenAI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  const data = (await res.json()) as {
    error?: { message?: string }
    choices?: Array<{ message?: { content?: string } }>
  }

  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI error ${res.status}`)
  }

  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI returned an empty reply')
  return text
}

async function generateGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const systemInstruction =
    systemParts.length > 0 ? { parts: [{ text: systemParts.join('\n\n') }] } : undefined

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...(systemInstruction ? { systemInstruction } : {}),
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  })

  const data = (await res.json()) as {
    error?: { message?: string }
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
    }>
  }

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gemini error ${res.status}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Gemini returned an empty reply')
  return text
}
