/** Canonical lead source keys + display labels. */
export const LEAD_SOURCES = [
  { value: 'manual', label: 'Manual' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Referral' },
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'other', label: 'Other' },
] as const

export type LeadSourceValue = (typeof LEAD_SOURCES)[number]['value']

const LABEL_BY_VALUE = Object.fromEntries(
  LEAD_SOURCES.map((s) => [s.value, s.label]),
) as Record<string, string>

/** Human label for a stored source key (falls back to title-cased custom). */
export function formatLeadSource(source?: string | null): string {
  const key = source?.trim()
  if (!key) return 'Unknown'
  if (LABEL_BY_VALUE[key]) return LABEL_BY_VALUE[key]
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function normalizeLeadSource(
  raw?: string | null,
): string | null {
  const t = raw?.trim()
  if (!t) return null
  const lower = t.toLowerCase().replace(/\s+/g, '_')
  const known = LEAD_SOURCES.find(
    (s) => s.value === lower || s.label.toLowerCase() === t.toLowerCase(),
  )
  return known?.value ?? lower
}
