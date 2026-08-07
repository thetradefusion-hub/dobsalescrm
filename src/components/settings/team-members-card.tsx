'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Users } from 'lucide-react'
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

interface MemberRow {
  id: string
  user_id: string
  full_name: string | null
  email: string
  role: string | null
  created_at?: string
}

export function TeamMembersCard() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/team/members')
      const json = (await res.json()) as { members?: MemberRow[]; error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to load team')
      setMembers(json.members ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role_slug: 'sales_executive',
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to create member')
      toast.success('Sales Executive created')
      setFullName('')
      setEmail('')
      setPassword('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-wa-border bg-wa-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-wa-text">
            <Users className="size-5" />
            Team members
          </CardTitle>
          <CardDescription className="text-wa-muted">
            Create Sales Executive logins under your account. They share your
            CRM workspace; WhatsApp stays on the company number unless you later
            grant own-number permission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-wa-muted">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : (
            <ul className="divide-y divide-wa-border rounded-xl border border-wa-border">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-wa-text">
                      {m.full_name || m.email}
                    </p>
                    <p className="truncate text-xs text-wa-muted">{m.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">
                    {m.role === 'admin' ? 'Admin' : m.role?.replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
              {members.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-wa-muted">
                  No members yet
                </li>
              ) : null}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-wa-border bg-wa-panel">
        <CardHeader>
          <CardTitle className="text-wa-text">Add Sales Executive</CardTitle>
          <CardDescription className="text-wa-muted">
            They can log in with this email/password and only see assigned data
            (full assigned scoping completes in Phase 4).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temp password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create Sales Executive
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
