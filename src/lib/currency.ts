/** Default currency for new deals / pipeline leads (Indian Rupee). */
export const DEFAULT_DEAL_CURRENCY = 'INR'

export const DEFAULT_CURRENCY_LOCALE = 'en-IN'

export const DEAL_CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
] as const

export function formatDealCurrency(
  value: number,
  currency: string = DEFAULT_DEAL_CURRENCY,
): string {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, {
    style: 'currency',
    currency: currency || DEFAULT_DEAL_CURRENCY,
    maximumFractionDigits: 0,
  }).format(value)
}

/** Compact ₹ display for charts (e.g. ₹1.2k, ₹3.5M). */
export function formatDealCurrencyShort(
  value: number,
  currency: string = DEFAULT_DEAL_CURRENCY,
): string {
  const sym =
    currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
  if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${sym}${(value / 1_000).toFixed(1)}k`
  return `${sym}${value.toFixed(0)}`
}
