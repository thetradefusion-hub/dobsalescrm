'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact } from '@/types'
import type { LeadTemperature } from '@/lib/ai/lead-qualification'
import { createLeadFromContact } from '@/lib/leads/create-from-contact'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

interface CreateLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (dealId: string) => void
  /** Pre-select a contact when opening from contact detail. */
  defaultContactId?: string
}

export function CreateLeadDialog({
  open,
  onOpenChange,
  onCreated,
  defaultContactId,
}: CreateLeadDialogProps) {
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState('')
  const [temperature, setTemperature] = useState<LeadTemperature | ''>('')
  const [score, setScore] = useState('')
  const [saving, setSaving] = useState(false)

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true)
    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true })
        .limit(20)

      if (search.trim()) {
        const term = `%${search.trim()}%`
        query = query.or(`name.ilike.${term},phone.ilike.${term}`)
      }

      const { data, error } = await query
      if (error) throw error
      setContacts(data ?? [])
    } catch {
      toast.error('Failed to load contacts')
    } finally {
      setLoadingContacts(false)
    }
  }, [supabase, search])

  useEffect(() => {
    if (!open) return
    setTitle('')
    setTemperature('')
    setScore('')
    setSelectedContactId(defaultContactId ?? '')
    setSearch('')
    void loadContacts()
  }, [open, defaultContactId, loadContacts])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => void loadContacts(), 300)
    return () => clearTimeout(t)
  }, [search, open, loadContacts])

  async function handleCreate() {
    if (!selectedContactId) {
      toast.error('Select a contact')
      return
    }

    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Not signed in')

      const parsedScore = score.trim() ? Number.parseInt(score, 10) : null

      const result = await createLeadFromContact(supabase, user.id, {
        contactId: selectedContactId,
        title: title.trim() || undefined,
        leadTemperature: temperature || null,
        leadScore:
          parsedScore != null && Number.isFinite(parsedScore)
            ? Math.min(100, Math.max(0, parsedScore))
            : null,
      })

      if (result.created) {
        toast.success('Lead created')
      } else {
        toast.info('This contact already has an open lead')
      }

      onOpenChange(false)
      onCreated(result.dealId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-wa-border bg-wa-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-wa-text">Create Lead</DialogTitle>
          <DialogDescription className="text-wa-muted">
            Link a contact to your sales pipeline. Each contact can have one
            open lead at a time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-wa-text">Contact</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-wa-muted/80" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="border-wa-border bg-wa-surface pl-8 text-wa-text"
              />
            </div>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-wa-border">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-wa-green" />
                </div>
              ) : contacts.length === 0 ? (
                <p className="py-4 text-center text-sm text-wa-muted">
                  No contacts found
                </p>
              ) : (
                contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedContactId(c.id)}
                    className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-wa-surface ${
                      selectedContactId === c.id
                        ? 'bg-wa-green/10 text-wa-green'
                        : 'text-wa-text/90'
                    }`}
                  >
                    <span className="font-medium">{c.name ?? 'Unknown'}</span>
                    <span className="text-xs text-wa-muted">{c.phone}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-title" className="text-wa-text">
              Title
            </Label>
            <Input
              id="lead-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Website project inquiry"
              className="border-wa-border bg-wa-surface text-wa-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-temp" className="text-wa-text">
                Temperature
              </Label>
              <select
                id="lead-temp"
                value={temperature}
                onChange={(e) =>
                  setTemperature(e.target.value as LeadTemperature | '')
                }
                className="h-9 w-full rounded-md border border-wa-border bg-wa-surface px-2 text-sm text-wa-text"
              >
                <option value="">Unqualified</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-score" className="text-wa-text">
                Score (0–100)
              </Label>
              <Input
                id="lead-score"
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Optional"
                className="border-wa-border bg-wa-surface text-wa-text"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-wa-border text-wa-text/90"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleCreate()}
            disabled={saving || !selectedContactId}
            className="bg-wa-bubble-out text-wa-text hover:bg-wa-teal hover:text-white"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Lead'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
