'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="crm-by-rakesh-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
