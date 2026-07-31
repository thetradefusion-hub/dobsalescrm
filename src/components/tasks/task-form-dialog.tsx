'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import type { Contact, Profile } from '@/types'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '@/lib/tasks/types'
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from '@/lib/tasks/types'
import { createTask, updateTask } from '@/lib/tasks/queries'
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

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  onSaved: () => void
}

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  onSaved,
}: TaskFormDialogProps) {
  const supabase = createClient()
  const { user } = useAuth()
  const editing = !!task

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueAt, setDueAt] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [contactId, setContactId] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setStatus(task?.status ?? 'todo')
    setPriority(task?.priority ?? 'medium')
    setDueAt(toLocalInputValue(task?.due_at))
    setAssigneeId(task?.assigned_to ?? '')
    setContactId(task?.contact_id ?? '')
    setContactSearch('')
  }, [open, task])

  useEffect(() => {
    if (!open) return
    void supabase
      .from('profiles')
      .select('*')
      .order('full_name')
      .then(({ data }) => setProfiles((data ?? []) as Profile[]))
  }, [open, supabase])

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true)
    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true })
        .limit(25)

      if (contactSearch.trim()) {
        const term = `%${contactSearch.trim()}%`
        query = query.or(`name.ilike.${term},phone.ilike.${term}`)
      }

      const { data, error } = await query
      if (error) throw error
      setContacts((data ?? []) as Contact[])
    } catch {
      toast.error('Failed to load contacts')
    } finally {
      setLoadingContacts(false)
    }
  }, [supabase, contactSearch])

  useEffect(() => {
    if (!open) return
    void loadContacts()
  }, [open, loadContacts])

  async function handleSave() {
    if (!user?.id) {
      toast.error('You must be signed in')
      return
    }
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)
    try {
      const payload: TaskInput = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        assigned_to: assigneeId || null,
        contact_id: contactId || null,
      }

      if (editing && task) {
        await updateTask(supabase, task.id, payload)
        toast.success('Task updated')
      } else {
        await createTask(supabase, user.id, payload)
        toast.success('Task created')
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'h-9 w-full rounded-lg border border-wa-border bg-wa-surface px-3 text-sm text-wa-text outline-none focus:border-wa-green'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-wa-border bg-wa-panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-wa-text">
            {editing ? 'Edit task' : 'New task'}
          </DialogTitle>
          <DialogDescription className="text-wa-muted">
            Track follow-ups, calls, demos, and sales to-dos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-wa-text">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call client about proposal"
              className="border-wa-border bg-wa-surface text-wa-text"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-wa-text">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes…"
              className="w-full resize-none rounded-lg border border-wa-border bg-wa-surface px-3 py-2 text-sm text-wa-text outline-none focus:border-wa-green"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-wa-text">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={fieldClass}
              >
                {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-wa-text">Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={fieldClass}
              >
                {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(
                  (p) => (
                    <option key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-wa-text">Due</Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="border-wa-border bg-wa-surface text-wa-text"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-wa-text">Assignee</Label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-wa-text">Linked contact</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-wa-muted" />
              <Input
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts…"
                className="border-wa-border bg-wa-surface pl-8 text-wa-text"
              />
            </div>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className={fieldClass}
            >
              <option value="">No contact</option>
              {loadingContacts ? (
                <option disabled>Loading…</option>
              ) : (
                contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.phone}
                    {c.company ? ` · ${c.company}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-wa-border"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-wa-green text-white hover:bg-wa-teal"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : editing ? (
              'Save changes'
            ) : (
              'Create task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
