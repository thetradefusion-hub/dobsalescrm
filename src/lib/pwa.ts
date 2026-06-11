export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const PWA_DISMISS_KEY = 'crm-pwa-install-dismissed'
export const PWA_DISMISS_MS = 7 * 24 * 60 * 60 * 1000

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  )
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  )
}

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 1023px)').matches
}

export function wasInstallBannerDismissed(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = localStorage.getItem(PWA_DISMISS_KEY)
    if (!raw) return false
    const dismissedAt = Number(raw)
    if (Number.isNaN(dismissedAt)) return false
    return Date.now() - dismissedAt < PWA_DISMISS_MS
  } catch {
    return false
  }
}

export function dismissInstallBanner(): void {
  try {
    localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()))
  } catch {
    /* ignore quota / private mode */
  }
}
