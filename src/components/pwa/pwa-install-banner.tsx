'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Share, Smartphone, X } from 'lucide-react'
import { BRAND_NAME, BRAND_SHORT_NAME } from '@/lib/brand'
import {
  dismissInstallBanner,
  isIOS,
  isMobileViewport,
  isStandalone,
  wasInstallBannerDismissed,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent
  }
}

interface PwaInstallBannerProps {
  className?: string
}

export function PwaInstallBanner({ className }: PwaInstallBannerProps) {
  const [visible, setVisible] = useState(false)
  const [mode, setMode] = useState<'install' | 'ios'>('install')
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (isStandalone() || wasInstallBannerDismissed() || !isMobileViewport()) {
      return
    }

    const showBanner = (nextMode: 'install' | 'ios') => {
      setMode(nextMode)
      setVisible(true)
    }

    if (isIOS()) {
      const timer = window.setTimeout(() => showBanner('ios'), 1200)
      return () => window.clearTimeout(timer)
    }

    if (window.deferredPrompt) {
      const timer = window.setTimeout(() => showBanner('install'), 800)
      return () => window.clearTimeout(timer)
    }

    const onReady = () => {
      if (!wasInstallBannerDismissed()) showBanner('install')
    }

    window.addEventListener('pwa-install-ready', onReady)
    return () => window.removeEventListener('pwa-install-ready', onReady)
  }, [])

  const handleDismiss = useCallback(() => {
    dismissInstallBanner()
    setVisible(false)
  }, [])

  const handleInstall = useCallback(async () => {
    const prompt = window.deferredPrompt
    if (!prompt) return

    setInstalling(true)
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
      } else {
        dismissInstallBanner()
        setVisible(false)
      }
    } catch {
      /* user cancelled or browser blocked */
    } finally {
      window.deferredPrompt = undefined
      setInstalling(false)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Install app"
      className={cn(
        'pointer-events-none fixed inset-x-0 z-50 px-3 lg:hidden',
        'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto max-w-md overflow-hidden rounded-2xl border border-wa-green/25 bg-wa-panel/95 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-wa-green via-wa-teal to-wa-read" />

        <div className="flex items-start gap-3 p-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-wa-green to-wa-teal shadow-md shadow-wa-green/25">
            <Smartphone className="h-6 w-6 text-white" aria-hidden />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold text-wa-text">
              Install {BRAND_SHORT_NAME}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-wa-muted">
              {mode === 'ios' ? (
                <>
                  Tap <Share className="inline h-3 w-3 align-text-bottom" />{' '}
                  Share, then <strong className="font-semibold text-wa-text">Add to Home Screen</strong>{' '}
                  for the full app experience.
                </>
              ) : (
                <>
                  Add {BRAND_NAME} to your home screen for faster access, push
                  alerts, and a native app feel.
                </>
              )}
            </p>

            {mode === 'install' && (
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-wa-green px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-wa-green/30 active:scale-[0.98] disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {installing ? 'Installing…' : 'Install app'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-wa-muted transition-colors hover:bg-wa-surface hover:text-wa-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
