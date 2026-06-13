'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  /** Compact icon-only (header) vs labeled (auth pages). */
  variant?: 'icon' | 'labeled'
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const isDark = (resolvedTheme ?? theme ?? 'dark') === 'dark'

  function toggle() {
    setTheme(isDark ? 'light' : 'dark')
  }

  if (!mounted) {
    return (
      <span
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md',
          className,
        )}
        aria-hidden
      />
    )
  }

  if (variant === 'labeled') {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-wa-border bg-wa-surface px-3 py-2 text-sm font-medium text-wa-text transition-colors hover:bg-wa-elevated',
          className,
        )}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {isDark ? <Sun className="h-4 w-4 text-wa-green" /> : <Moon className="h-4 w-4 text-wa-teal" />}
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md text-wa-muted transition-colors hover:bg-wa-surface hover:text-wa-text',
        className,
      )}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
