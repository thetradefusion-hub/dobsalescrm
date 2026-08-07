'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type { LeadTemperature } from '@/lib/ai/lead-qualification'
import { createLeadFromDetails } from '@/lib/leads/create-from-contact'
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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { hasPermission } from '@/lib/auth/permissions'
import { LEAD_SOURCES } from '@/lib/leads/sources'

interface CreateLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (dealId: string) => void
  /** Optional prefill when opened from an existing contact. */
  defaultContactId?: string
}

export function CreateLeadDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateLeadDialogProps) {
  const supabase = createClient()
  const { isAdmin, permissions } = useAuth()
  const canAssign =
    isAdmin ||
    hasPermission(permissions, '*') ||
    hasPermission(permissions, 'leads.assign')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [requirement, setRequirement] = useState('')
  const [remark, setRemark] = useState('')
  const [source, setSource] = useState('manual')
  const [temperature, setTemperature] = useState<LeadTemperature | ''>('')
  const [assignedTo, setAssignedTo] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setPhone('')
    setCity('')
    setEmail('')
    setCompany('')
    setRequirement('')
    setRemark('')
    setSource('manual')
    setTemperature('')
    setAssignedTo('')
  }, [open])

  useEffect(() => {
    if (!open || !canAssign) return
    void supabase
      .from('profiles')
      .select('*')
      .order('full_name')
      .then(({ data }) => setProfiles((data ?? []) as Profile[]))
  }, [open, canAssign, supabase])

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!phone.trim()) {
      toast.error('Mobile number is required')
      return
    }

    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Not signed in')

      const result = await createLeadFromDetails(supabase, user.id, {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim() || undefined,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        requirement: requirement.trim() || undefined,
        remark: remark.trim() || undefined,
        source,
        leadTemperature: temperature || null,
        assignedTo: canAssign
          ? assignedTo
            ? assignedTo
            : null
          : undefined,
      })

      if (result.created) {
        toast.success('Lead created')
      } else {
        toast.info('This contact already has an open lead — opened existing')
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
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-lg dark:border-saas-border dark:bg-saas-card">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-saas-text">
            Add New Lead
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Enter contact details, requirement, and remarks. A contact is
            created automatically from the mobile number.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-name">
              Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-phone">
              Mobile number <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="lead-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9198XXXXXXXX"
              inputMode="tel"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-city">City</Label>
            <Input
              id="lead-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Jaipur"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-email">Email</Label>
            <Input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="optional@"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-company">Company</Label>
            <Input
              id="lead-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-requirement">Requirement</Label>
            <Input
              id="lead-requirement"
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="e.g. WhatsApp CRM setup, Website redesign"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-remark">Remark / Summary</Label>
            <textarea
              id="lead-remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder="Call notes, source, budget, follow-up context…"
              className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200 dark:border-saas-border dark:bg-saas-bg dark:text-saas-text"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-source">Lead source</Label>
            <select
              id="lead-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm"
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-temp">Priority</Label>
            <select
              id="lead-temp"
              value={temperature}
              onChange={(e) =>
                setTemperature(e.target.value as LeadTemperature | '')
              }
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm"
            >
              <option value="">Unqualified</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>

          {canAssign ? (
            <div className="space-y-1.5">
              <Label htmlFor="lead-assignee">Assign to</Label>
              <select
                id="lead-assignee"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm"
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                    {p.role === 'sales_executive' ? ' (SE)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleCreate()}
            disabled={saving}
            className="bg-sky-600 text-white hover:bg-sky-500"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Add Lead'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
