/** WhatsApp interactive menu option (button or list row). */
export interface InteractiveMenuOption {
  /** Stable id returned on tap — use in keyword_match automations. Max 256 chars. */
  id: string
  /** Visible label. Buttons: max 20 chars. List rows: max 24 chars. */
  title: string
  /** List rows only — max 72 chars. */
  description?: string
}

export interface InteractiveMenuPayload {
  menu_type: 'buttons' | 'list'
  body: string
  header?: string
  footer?: string
  /** List menu only — label on the open button (max 20 chars). */
  list_button_text?: string
  options: InteractiveMenuOption[]
}

export function normalizeInteractiveMenu(
  raw: InteractiveMenuPayload,
): InteractiveMenuPayload {
  const menu_type = raw.menu_type === 'list' ? 'list' : 'buttons'
  const options = (raw.options ?? [])
    .map((o) => ({
      id: String(o.id ?? '').trim(),
      title: String(o.title ?? '').trim(),
      description: o.description ? String(o.description).trim() : undefined,
    }))
    .filter((o) => o.id && o.title)

  return {
    menu_type,
    body: String(raw.body ?? '').trim(),
    header: raw.header ? String(raw.header).trim() : undefined,
    footer: raw.footer ? String(raw.footer).trim() : undefined,
    list_button_text: raw.list_button_text
      ? String(raw.list_button_text).trim()
      : 'View options',
    options,
  }
}

export function validateInteractiveMenu(menu: InteractiveMenuPayload): string[] {
  const errors: string[] = []
  if (!menu.body) errors.push('menu body is required')
  if (menu.body.length > 1024) errors.push('menu body max 1024 characters')

  if (menu.menu_type === 'buttons') {
    if (menu.options.length === 0) errors.push('add at least one button')
    if (menu.options.length > 3) errors.push('WhatsApp allows max 3 buttons')
    for (const o of menu.options) {
      if (o.title.length > 20) errors.push(`button "${o.title}" max 20 characters`)
      if (o.id.length > 256) errors.push(`button id "${o.id}" max 256 characters`)
    }
  } else {
    if (menu.options.length === 0) errors.push('add at least one list item')
    if (menu.options.length > 10) errors.push('WhatsApp allows max 10 list items')
    const btn = menu.list_button_text ?? 'View options'
    if (btn.length > 20) errors.push('list open button max 20 characters')
    for (const o of menu.options) {
      if (o.title.length > 24) errors.push(`list item "${o.title}" max 24 characters`)
      if (o.description && o.description.length > 72) {
        errors.push(`description for "${o.title}" max 72 characters`)
      }
    }
  }

  return errors
}

export function summarizeInteractiveMenu(menu: InteractiveMenuPayload): string {
  const labels = menu.options.map((o) => o.title).join(', ')
  return `[Menu] ${menu.body}${labels ? ` (${labels})` : ''}`
}
