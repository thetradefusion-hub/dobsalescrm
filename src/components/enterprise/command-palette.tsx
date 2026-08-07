'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const COMMANDS: { label: string; href: string; hint?: string }[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Leads', href: '/leads', hint: 'Pipeline leads' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Pipelines', href: '/pipelines' },
  { label: 'Inbox', href: '/inbox', hint: 'WhatsApp' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Broadcasts', href: '/broadcasts' },
  { label: 'Automations', href: '/automations' },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' },
  { label: 'AI Settings', href: '/settings?tab=ai' },
  { label: 'New Broadcast', href: '/broadcasts/new' },
]

export const OPEN_COMMAND_PALETTE = 'wacrm:open-command-palette'

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return COMMANDS
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.href.includes(query) ||
        (c.hint?.toLowerCase().includes(query) ?? false),
    )
  }, [q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen)
    }
  }, [])

  useEffect(() => {
    setActive(0)
  }, [q, open])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      setQ('')
      router.push(href)
    },
    [router],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[12px] border border-saas-border bg-saas-card shadow-saas-md"
      >
        <div className="flex items-center gap-2 border-b border-saas-border px-3 py-2.5">
          <Search className="size-4 text-saas-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, filtered.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter' && filtered[active]) {
                e.preventDefault()
                go(filtered[active].href)
              }
            }}
            placeholder="Search leads, deals, contacts…"
            className="min-w-0 flex-1 bg-transparent text-sm text-saas-text outline-none placeholder:text-saas-muted"
          />
          <kbd className="rounded border border-saas-border px-1.5 py-0.5 text-[10px] text-saas-muted">
            Esc
          </kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-saas-muted">
              No matches
            </li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.href + item.label}>
                <button
                  type="button"
                  onClick={() => go(item.href)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm',
                    i === active
                      ? 'bg-saas-accent-soft text-saas-accent'
                      : 'text-saas-text hover:bg-saas-bg',
                  )}
                >
                  <span className="font-medium">{item.label}</span>
                  {item.hint ? (
                    <span className="text-[10px] text-saas-muted">{item.hint}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

export function CommandPaletteTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))}
      className={cn(
        'hidden w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 transition hover:border-violet-300 hover:bg-white md:flex',
        className,
      )}
    >
      <Search className="size-3.5 shrink-0" />
      <span className="flex-1 truncate text-left">
        Search leads, deals, contacts…
      </span>
      <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
        ⌘ K
      </kbd>
    </button>
  )
}
