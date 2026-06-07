'use client'

import { useTheme } from 'next-themes'
import { Toaster } from 'sonner'

export function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'

  return (
    <Toaster
      theme={isDark ? 'dark' : 'light'}
      position="top-right"
      toastOptions={{
        style: isDark
          ? {
              background: '#202C33',
              border: '1px solid #313D45',
              color: '#E9EDEF',
            }
          : {
              background: '#FFFFFF',
              border: '1px solid #D1D7DB',
              color: '#111B21',
            },
      }}
    />
  )
}
