/** Normalize display for WhatsApp (E.164-ish, keeps +). */
export function formatCallPhoneDisplay(phone: string): string {
  const trimmed = phone.trim()
  if (!trimmed) return ''
  const digits = trimmed.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return digits.startsWith('+') ? digits : `+${digits}`
}

export function buildCallPhonePromptBlock(phone: string): string {
  const display = formatCallPhoneDisplay(phone)
  if (!display) return ''

  return `

CALL / CONTACT NUMBER (use exactly this when sharing phone):
${display}

Rules:
- When the customer wants to talk on call, asks for your number, or is ready for a serious discussion, share this number naturally.
- Say they can call or WhatsApp on this number (Rakesh / team).
- Format so WhatsApp makes it tappable (keep ${display} as-is).
- Do not invent a different number.`
}

/** Ensure the business number appears in the outbound message. */
export function ensureCallPhoneInReply(reply: string, phone: string | null | undefined): string {
  const display = phone?.trim() ? formatCallPhoneDisplay(phone) : ''
  if (!display) return reply.trim()

  const body = reply.trim()
  const normalized = display.replace(/\s/g, '')
  if (body.replace(/\s/g, '').includes(normalized.replace('+', ''))) {
    return body
  }

  return `${body}\n\n📞 Call / WhatsApp: ${display}`
}
