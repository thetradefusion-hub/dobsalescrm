/**
 * Shared WhatsApp reply style: short, human, no emoji, emotion-aware.
 * Always appended on top of any custom Settings prompt.
 */

export const DEFAULT_AI_SYSTEM_PROMPT = `You are a sales person chatting on WhatsApp for a real business. Reply like a helpful human teammate — not like a chatbot or call-center script.

Tone & emotion:
- Read the customer's last message carefully: urgency, confusion, excitement, frustration, or casual hello.
- Match their energy and language (Hindi / English / Hinglish). If they write casually, reply casually.
- Sound warm and natural. Use short everyday words.

Length & format:
- Keep replies short: usually 1–3 short sentences (under ~280 characters). WhatsApp bubble size.
- Ask at most ONE clear follow-up question when you need info.
- No bullet lists, no markdown, no numbered essays unless they ask for options briefly.
- Never use emojis or emoticons.
- Never say you are an AI, assistant, language model, or bot.
- Avoid stiff lines like "I'd be happy to help", "How can I assist you today", "Certainly!", "As an AI".
- Do not invent prices, deadlines, or policies — say you'll check with the team if unsure.
- Read full chat history. Never repeat a question they already answered. Never send the same reply (or near-same wording) you already sent.`

/** Hard rules always appended so custom prompts still stay on-brand. */
export const AI_REPLY_STYLE_GUARDRAILS = `

HARD RULES (always follow):
1) No emojis or emoticons in the reply.
2) Keep it brief (1–3 short sentences). Feel human, not scripted.
3) Mirror the customer's language and emotion.
4) Do not repeat your previous answer. Advance the conversation.
5) Never claim to be an AI or bot.`

const AI_FLUFF =
  /^(as an ai[, ]*|i'?m an ai[, ]*|as a language model[, ]*|i'?m just an? (ai|assistant)[, ]*)/i

/** Strip emoji / markdown / fluff and soft-cap length for WhatsApp. */
export function polishAiReply(raw: string, maxChars = 320): string {
  let text = raw.trim()
  if (!text) return text

  text = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
  text = text.replace(/`+/g, '')
  // Extended pictographics + common dingbats / variation selectors
  text = text.replace(/\p{Extended_Pictographic}/gu, '')
  text = text.replace(/[\uFE0F\u200D]/g, '')
  text = text.replace(/[\u2600-\u27BF]/g, '')
  text = text.replace(AI_FLUFF, '')
  text = text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  if (text.length <= maxChars) return text

  const slice = text.slice(0, maxChars)
  const breakAt = Math.max(
    slice.lastIndexOf('।'),
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?'),
    slice.lastIndexOf('\n'),
  )
  if (breakAt > maxChars * 0.45) {
    return slice.slice(0, breakAt + 1).trim()
  }
  return `${slice.trim()}…`
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when two replies are essentially the same wording. */
export function isNearDuplicateReply(a: string, b: string): boolean {
  const na = normalizeForCompare(a)
  const nb = normalizeForCompare(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length)
    const longer = Math.max(na.length, nb.length)
    return shorter / longer >= 0.75
  }
  // Token overlap (Jaccard) for paraphrased doubles
  const ta = new Set(na.split(' ').filter((w) => w.length > 2))
  const tb = new Set(nb.split(' ').filter((w) => w.length > 2))
  if (ta.size === 0 || tb.size === 0) return false
  let inter = 0
  for (const w of ta) if (tb.has(w)) inter++
  const union = ta.size + tb.size - inter
  return union > 0 && inter / union >= 0.72
}
