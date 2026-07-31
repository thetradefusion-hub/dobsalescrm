'use client'

import Link from 'next/link'
import { MessageSquare, ShieldCheck, Zap } from 'lucide-react'
import { BRAND_DESCRIPTION } from '@/lib/brand'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/theme-toggle'

interface AuthShellProps {
  children: React.ReactNode
}

const HIGHLIGHTS = [
  { icon: MessageSquare, text: 'WhatsApp inbox & team replies' },
  { icon: Zap, text: 'AI automations & lead qualification' },
  { icon: ShieldCheck, text: 'Secure, self-hosted CRM' },
]

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-wa-deep">
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-wa-border bg-wa-panel/90 px-4 backdrop-blur-md sm:px-6">
        <Link
          href="/login"
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none ring-wa-green/40 focus-visible:ring-2"
        >
          <BrandLogo
            width={200}
            height={40}
            className="h-9 w-auto max-w-[11rem] sm:max-w-[14rem]"
            priority
          />
        </Link>
        <ThemeToggle variant="labeled" className="shrink-0 shadow-sm" />
      </header>

      <div className="grid min-h-screen pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <aside className="relative hidden overflow-hidden border-r border-wa-border bg-wa-panel lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
          <div className="pointer-events-none absolute inset-0 wa-canvas-grid opacity-40" aria-hidden />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-wa-green">
              Digital One Box Sales CRM
            </p>
            <h1 className="mt-3 max-w-sm text-2xl font-bold leading-snug text-wa-text xl:text-3xl">
              Manage leads, chats &amp; deals in one place
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-wa-muted">
              {BRAND_DESCRIPTION}
            </p>
          </div>
          <ul className="relative mt-10 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-wa-text/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wa-green/10 text-wa-green">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </aside>

        <main className="relative flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
          <div className="pointer-events-none absolute inset-0 wa-canvas-grid opacity-25 lg:hidden" aria-hidden />
          <div className="relative w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  )
}
