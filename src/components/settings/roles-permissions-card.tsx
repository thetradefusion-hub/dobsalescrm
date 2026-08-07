'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  PERMISSION_LABELS,
  type PermissionKey,
} from '@/lib/auth/permissions'
import { cn } from '@/lib/utils'

interface RoleRow {
  id: string
  name: string
  slug: string
  is_system: boolean
  is_admin: boolean
  description: string | null
  permissions: string[]
}

export function RolesPermissionsCard() {
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [catalog, setCatalog] = useState<PermissionKey[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/team/roles')
      const json = (await res.json()) as {
        roles?: RoleRow[]
        catalog?: PermissionKey[]
        error?: string
      }
      if (!res.ok) throw new Error(json.error || 'Failed to load roles')
      setRoles(json.roles ?? [])
      setCatalog(json.catalog ?? [])
      const firstEditable =
        (json.roles ?? []).find((r) => !r.is_admin) ?? (json.roles ?? [])[0]
      if (firstEditable) {
        setSelectedId(firstEditable.id)
        setSelectedPerms(new Set(firstEditable.permissions))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function selectRole(role: RoleRow) {
    setSelectedId(role.id)
    setSelectedPerms(new Set(role.permissions))
  }

  function togglePerm(key: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selected = roles.find((r) => r.id === selectedId)
  const locked = Boolean(selected?.is_admin)

  async function savePermissions() {
    if (!selectedId || locked) return
    setSaving(true)
    try {
      const res = await fetch('/api/team/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: selectedId,
          permissions: [...selectedPerms],
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success('Permissions saved')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/team/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          permissions: [
            'dashboard.view',
            'leads.view_assigned',
            'leads.edit_assigned',
            'settings.profile',
          ],
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Create failed')
      toast.success('Role created')
      setNewName('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-wa-muted">
        <Loader2 className="size-4 animate-spin" /> Loading roles…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-wa-border bg-wa-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-wa-text">
            <Shield className="size-5" />
            Roles & permissions
          </CardTitle>
          <CardDescription className="text-wa-muted">
            Admin is locked with full access. Edit Sales Executive or create
            custom roles — users only see what you enable.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[14rem_1fr]">
          <div className="space-y-1">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRole(r)}
                className={cn(
                  'flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition',
                  selectedId === r.id
                    ? 'bg-violet-600 text-white'
                    : 'text-wa-text hover:bg-wa-surface',
                )}
              >
                <span className="font-semibold">{r.name}</span>
                <span
                  className={cn(
                    'text-[10px]',
                    selectedId === r.id ? 'text-white/80' : 'text-wa-muted',
                  )}
                >
                  {r.slug}
                  {r.is_admin ? ' · locked' : ''}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-wa-text">
                    {selected.name}
                    {locked ? ' (full access)' : ''}
                  </p>
                  {!locked ? (
                    <Button size="sm" onClick={() => void savePermissions()} disabled={saving}>
                      {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Save
                    </Button>
                  ) : null}
                </div>
                {locked ? (
                  <p className="text-xs text-wa-muted">
                    Admin always has all permissions (`*`).
                  </p>
                ) : (
                  <div className="grid max-h-[28rem] gap-1 overflow-y-auto rounded-xl border border-wa-border p-2 sm:grid-cols-2">
                    {catalog.map((key) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-wa-surface"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedPerms.has(key)}
                          onChange={() => togglePerm(key)}
                        />
                        <span>
                          <span className="font-medium text-wa-text">
                            {PERMISSION_LABELS[key] ?? key}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] text-wa-muted">
                            {key}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-wa-muted">Select a role</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-wa-border bg-wa-panel">
        <CardHeader>
          <CardTitle className="text-wa-text">Create custom role</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createRole} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1 space-y-1.5">
              <Label>Role name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Team Lead"
                required
              />
            </div>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <Plus className="size-4" />
              Create
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
