'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Copy,
  FileText,
  History,
  Loader2,
  Pencil,
  Phone,
  UserRound,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Lead } from '@/lib/leads/types'
import type { PipelineStage, Profile } from '@/types'
import { formatFollowUp } from '@/lib/leads/format-follow-up'
import { countStageFollowUps } from '@/lib/leads/follow-up-stats'
import { formatDealCurrency } from '@/lib/currency'
import { LeadStageSelect } from '@/components/leads/lead-stage-select'
import { LeadPriorityBadge } from '@/components/leads/lead-priority-badge'
import { Switch } from '@/components/ui/switch'
import { stageAccordionTheme } from '@/components/leads/pipeline-chevron'
import { createClient } from '@/lib/supabase/client'
import { ensureConversationForContact } from '@/lib/inbox/ensure-conversation'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'
import { formatLeadSource } from '@/lib/leads/sources'
import {
  FOLLOWUP_PRESETS,
  type FollowUpPresetId,
} from '@/lib/leads/auto-followup'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error('Could not copy'),
  )
}

function waLink(phone?: string | null) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return null
  return `https://wa.me/${digits}`
}

export function LeadDenseRow({
  lead,
  stages,
  updatingStage,
  showAssignee,
  canAssign,
  assignees,
  assigning,
  selected,
  onToggleSelect,
  onEdit,
  onStageChange,
  onToggleFollowUp,
  onAssign,
}: {
  lead: Lead
  stages: PipelineStage[]
  updatingStage?: boolean
  showAssignee?: boolean
  canAssign?: boolean
  assignees?: Profile[]
  assigning?: boolean
  selected?: boolean
  onToggleSelect?: (selected: boolean) => void
  onEdit: () => void
  onStageChange: (stageId: string) => void
  onToggleFollowUp: (
    enabled: boolean,
    options?: { presetId?: FollowUpPresetId },
  ) => Promise<void>
  onAssign?: (assigneeProfileId: string | null) => Promise<void>
}) {
  const [followBusy, setFollowBusy] = useState(false)
  const [inboxBusy, setInboxBusy] = useState(false)
  const [followDialogOpen, setFollowDialogOpen] = useState(false)
  const [presetId, setPresetId] = useState<FollowUpPresetId>('1d')
  const router = useRouter()
  const followOn = Boolean(lead.follow_up_at)
  const followUp = formatFollowUp(lead.follow_up_at)
  const scheduleLabel = lead.follow_up_at
    ? new Date(lead.follow_up_at).toLocaleString([], {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  const phone = lead.contact?.phone
  const email = lead.contact?.email
  const contactId = lead.contact_id || lead.contact?.id
  const whatsapp = waLink(phone)
  const shortId = lead.id.replace(/-/g, '').slice(0, 7).toUpperCase()
  const sourceLabel = formatLeadSource(lead.source)
  const assigneeName =
    lead.assignee?.full_name?.trim() ||
    lead.assignee?.email ||
    null
  const assigneeInitial = (assigneeName || 'U').charAt(0).toUpperCase()

  async function openInboxChat() {
    if (!contactId) {
      toast.error('No contact linked to this lead')
      return
    }
    setInboxBusy(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not signed in')
      const convId = await ensureConversationForContact(
        supabase,
        session.user.id,
        contactId,
      )
      router.push(`/inbox?c=${convId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open chat')
    } finally {
      setInboxBusy(false)
    }
  }

  async function applyFollowUp(enabled: boolean, pid?: FollowUpPresetId) {
    setFollowBusy(true)
    try {
      await onToggleFollowUp(
        enabled,
        enabled ? { presetId: pid ?? presetId } : undefined,
      )
      setFollowDialogOpen(false)
    } finally {
      setFollowBusy(false)
    }
  }

  return (
    <div className="grid gap-3 border-t border-slate-100 bg-white px-3 py-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.95fr)_7.5rem] sm:items-start dark:border-saas-border dark:bg-saas-card">
      {/* Identity */}
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          {onToggleSelect ? (
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onChange={(e) => onToggleSelect(e.target.checked)}
              className="size-3.5 rounded border-slate-300"
              aria-label="Select lead"
            />
          ) : null}
          <span className="font-mono text-[10px] text-slate-400">{shortId}</span>
        </div>
        <p className="truncate text-sm font-bold text-slate-900 dark:text-saas-text">
          {lead.contact?.name || lead.title}
        </p>
        <LeadPriorityBadge temperature={lead.lead_temperature} />
        {phone ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="truncate">{phone}</span>
            <button
              type="button"
              className="text-slate-400 hover:text-violet-600"
              onClick={() => copyText('Phone', phone)}
              aria-label="Copy phone"
            >
              <Copy className="size-3" />
            </button>
            {contactId ? (
              <button
                type="button"
                onClick={() => void openInboxChat()}
                disabled={inboxBusy}
                className="text-emerald-600 hover:text-emerald-700 disabled:opacity-60"
                aria-label="Open WhatsApp"
                title="WhatsApp"
              >
                <WhatsAppIcon className="size-3.5" />
              </button>
            ) : whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700"
                aria-label="Open WhatsApp"
                title="WhatsApp"
              >
                <WhatsAppIcon className="size-3.5" />
              </a>
            ) : null}
            <Link
              href={`/inbox`}
              className="text-slate-400 hover:text-violet-600"
              title="Open inbox"
            >
              <FileText className="size-3.5" />
            </Link>
          </div>
        ) : null}

        {showAssignee ? (
          <div className="pt-1">
            <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Assigned to
            </p>
            {canAssign && onAssign ? (
              <select
                value={lead.assigned_to ?? ''}
                disabled={assigning}
                onChange={(e) => {
                  void onAssign(e.target.value || null)
                }}
                className="h-7 max-w-full rounded-full border border-violet-200 bg-violet-50 px-2 text-[11px] font-semibold text-violet-700 outline-none"
              >
                <option value="">Unassigned</option>
                {(assignees ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email || 'User'}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className={cn(
                  'inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  assigneeName
                    ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                    : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
                )}
                title={assigneeName ? `Assigned to ${assigneeName}` : 'Unassigned'}
              >
                {assigneeName ? (
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
                    {assigneeInitial}
                  </span>
                ) : (
                  <UserRound className="size-3" />
                )}
                <span className="truncate">
                  {assigneeName ?? 'Unassigned'}
                </span>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span
            className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700"
            title="Lead source"
          >
            {sourceLabel}
          </span>
          <label className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
            <Switch
              checked={followOn}
              disabled={followBusy}
              onCheckedChange={(checked) => {
                if (checked) {
                  setPresetId('1d')
                  setFollowDialogOpen(true)
                  return
                }
                void applyFollowUp(false)
              }}
            />
            Auto Followup
          </label>
        </div>
      </div>

      {/* Additional info */}
      <div className="min-w-0 text-[11px] text-slate-500">
        <p className="truncate font-semibold text-slate-800 dark:text-saas-text">
          {lead.contact?.company || lead.title}
        </p>
        {email ? <p className="mt-0.5 truncate">{email}</p> : null}
        {lead.contact?.city ? (
          <p className="mt-0.5 truncate">{lead.contact.city}</p>
        ) : null}
        <p className="mt-0.5">
          Value:{' '}
          <span className="font-semibold text-slate-700">
            {formatDealCurrency(lead.value ?? 0)}
          </span>
        </p>
        <p className="mt-0.5">
          Created:{' '}
          {lead.created_at
            ? new Date(lead.created_at).toLocaleDateString()
            : '—'}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="mt-1 inline-flex items-center gap-1 text-violet-600 hover:underline"
        >
          <Pencil className="size-3" />
          Edit
        </button>
      </div>

      {/* Notes */}
      <div className="min-w-0 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-saas-bg dark:text-saas-muted">
        <p className="line-clamp-4 whitespace-pre-wrap">
          {lead.notes?.trim() || lead.title || 'No notes yet.'}
        </p>
      </div>

      {/* Follow-up */}
      <div className="min-w-0 space-y-1.5 text-[11px]">
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold',
            followUp.tone === 'overdue' && 'bg-rose-50 text-rose-700',
            followUp.tone === 'soon' && 'bg-sky-50 text-sky-700',
            followUp.tone === 'default' && followOn && 'bg-emerald-50 text-emerald-700',
            !followOn && 'bg-slate-100 text-slate-500',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              followUp.tone === 'overdue' && 'bg-rose-500',
              followUp.tone === 'soon' && 'bg-sky-500',
              followUp.tone === 'default' && followOn && 'bg-emerald-500',
              !followOn && 'bg-slate-300',
            )}
          />
          {followUp.tone === 'overdue'
            ? 'Expired follow-up'
            : followOn
              ? 'Follow-up scheduled'
              : 'No follow-up'}
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <WhatsAppIcon className="size-3.5 text-emerald-600" />
          <Phone className="size-3.5" />
          <FileText className="size-3.5" />
        </div>
        <p className="text-slate-500">
          Next:{' '}
          <span
            className={cn(
              'font-medium',
              followUp.tone === 'overdue'
                ? 'text-rose-600'
                : followUp.tone === 'soon'
                  ? 'text-sky-700'
                  : 'text-slate-700',
            )}
          >
            {followUp.label}
          </span>
        </p>
        {scheduleLabel ? (
          <p className="text-slate-400">Due: {scheduleLabel}</p>
        ) : null}
        <div className="flex items-center gap-2">
          {followOn ? (
            <button
              type="button"
              disabled={followBusy}
              onClick={() => void applyFollowUp(false)}
              className="font-semibold text-rose-500 hover:underline"
            >
              Clear
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPresetId('1d')
                setFollowDialogOpen(true)
              }}
              className="font-semibold text-sky-600 hover:underline"
            >
              + Schedule
            </button>
          )}
          {followOn ? (
            <button
              type="button"
              disabled={followBusy}
              onClick={() => {
                setPresetId('1d')
                setFollowDialogOpen(true)
              }}
              className="font-semibold text-sky-600 hover:underline"
            >
              Reschedule
            </button>
          ) : null}
          <History className="size-3.5 text-slate-300" />
        </div>
      </div>

      {/* Stage + actions */}
      <div className="flex flex-col items-stretch gap-2">
        {updatingStage ? (
          <Loader2 className="mx-auto size-4 animate-spin text-violet-600" />
        ) : (
          <LeadStageSelect
            stageId={lead.stage_id}
            stages={stages}
            disabled={updatingStage}
            onChange={onStageChange}
          />
        )}
        {contactId ? (
          <button
            type="button"
            onClick={() => void openInboxChat()}
            disabled={inboxBusy}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-60"
            title="Open WhatsApp chat in Inbox"
          >
            {inboxBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <WhatsAppIcon className="size-3.5" />
            )}
            WhatsApp
          </button>
        ) : whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-200"
          >
            <WhatsAppIcon className="size-3.5" />
            WhatsApp
          </a>
        ) : null}
      </div>

      <Dialog open={followDialogOpen} onOpenChange={setFollowDialogOpen}>
        <DialogContent className="max-w-sm gap-4">
          <DialogHeader>
            <DialogTitle className="text-base">Schedule follow-up</DialogTitle>
            <DialogDescription>
              Sets the next follow-up date and creates a Tasks reminder for{' '}
              {lead.contact?.name || lead.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`follow-preset-${lead.id}`}>When</Label>
            <select
              id={`follow-preset-${lead.id}`}
              value={presetId}
              onChange={(e) =>
                setPresetId(e.target.value as FollowUpPresetId)
              }
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm"
            >
              {FOLLOWUP_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={followBusy}
              onClick={() => setFollowDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={followBusy}
              onClick={() => void applyFollowUp(true, presetId)}
            >
              {followBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Schedule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function LeadStageAccordion({
  stage,
  count,
  leads,
  open,
  onToggle,
  stagesForSelect,
  updatingStageId,
  showAssignee,
  canAssign,
  assignees,
  assigningLeadId,
  selectedIds,
  onToggleSelect,
  onToggleSelectStage,
  onEdit,
  onStageChange,
  onToggleFollowUp,
  onAssign,
}: {
  stage: PipelineStage
  count: number
  leads: Lead[]
  open: boolean
  onToggle: () => void
  stagesForSelect: PipelineStage[]
  updatingStageId: string | null
  showAssignee?: boolean
  canAssign?: boolean
  assignees?: Profile[]
  assigningLeadId?: string | null
  selectedIds?: Set<string>
  onToggleSelect?: (leadId: string, selected: boolean) => void
  onToggleSelectStage?: (leadIds: string[], selected: boolean) => void
  onEdit: (lead: Lead) => void
  onStageChange: (leadId: string, stageId: string) => void
  onToggleFollowUp: (
    leadId: string,
    enabled: boolean,
    options?: { presetId?: FollowUpPresetId },
  ) => Promise<void>
  onAssign?: (leadId: string, assigneeProfileId: string | null) => Promise<void>
}) {
  const pastel = stageAccordionTheme(stage.name, stage.color)
  const stageLeadIds = leads.map((l) => l.id)
  const followStats = countStageFollowUps(leads)
  const allSelected =
    stageLeadIds.length > 0 &&
    stageLeadIds.every((id) => selectedIds?.has(id))

  const sortedLeads = [...leads].sort((a, b) => {
    const aOver = a.follow_up_at ? new Date(a.follow_up_at).getTime() : Infinity
    const bOver = b.follow_up_at ? new Date(b.follow_up_at).getTime() : Infinity
    // Overdue / soonest first when expanded
    return aOver - bOver
  })

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border',
        pastel.bg,
        pastel.border,
      )}
      style={{
        ...pastel.style,
        ...pastel.borderStyle,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className={cn(
          'grid w-full cursor-pointer items-center gap-x-3 px-3 py-2 text-left transition hover:brightness-[0.98]',
          onToggleSelectStage
            ? 'grid-cols-[0.875rem_minmax(9.5rem,12rem)_minmax(1rem,1fr)_auto_auto_7rem]'
            : 'grid-cols-[minmax(9.5rem,12rem)_minmax(1rem,1fr)_auto_auto_7rem]',
        )}
      >
        {onToggleSelectStage ? (
          <input
            type="checkbox"
            checked={allSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelectStage(stageLeadIds, e.target.checked)
            }}
            className="size-3.5 shrink-0 justify-self-start rounded border-slate-300 bg-white"
            aria-label={`Select all in ${stage.name}`}
          />
        ) : null}

        <span
          className={cn(
            'truncate text-[15px] font-semibold tracking-tight',
            pastel.text,
          )}
        >
          {stage.name}{' '}
          <span className="font-semibold tabular-nums">({count})</span>
        </span>

        <span className="min-w-[1rem]" aria-hidden />

        <span
          className={cn(
            'inline-flex w-fit max-w-full items-center gap-1 justify-self-start rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold shadow-sm ring-1',
            followStats.today > 0
              ? 'text-sky-700 ring-sky-200'
              : 'text-slate-400 ring-slate-200/80',
          )}
          title="Follow-ups due later today"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-sky-500" />
          Today followup{' '}
          <span className="tabular-nums">{followStats.today}</span>
        </span>

        <span
          className={cn(
            'inline-flex w-fit max-w-full items-center gap-1 justify-self-start rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold shadow-sm ring-1',
            followStats.expired > 0
              ? 'text-rose-700 ring-rose-200'
              : 'text-slate-400 ring-slate-200/80',
          )}
          title="Follow-up date already passed"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-rose-500" />
          Expired followup{' '}
          <span className="tabular-nums">{followStats.expired}</span>
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className={cn(
            'inline-flex w-full items-center justify-center gap-1 justify-self-stretch rounded-md border bg-white/80 px-2 py-1 text-[11px] font-semibold shadow-sm transition hover:bg-white',
            pastel.border,
            pastel.text,
          )}
        >
          {open ? 'Hide leads' : 'Show leads'}
          <ChevronDown
            className={cn(
              'size-3 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>
      </div>

      {open ? (
        <div className="border-t border-black/5 bg-white/70 dark:bg-saas-card/90">
          {sortedLeads.length === 0 ? (
            <p className="px-3 py-5 text-center text-xs text-slate-400">
              No leads in this stage
            </p>
          ) : (
            sortedLeads.map((lead) => (
              <LeadDenseRow
                key={lead.id}
                lead={lead}
                stages={stagesForSelect}
                updatingStage={updatingStageId === lead.id}
                showAssignee={showAssignee}
                canAssign={canAssign}
                assignees={assignees}
                assigning={assigningLeadId === lead.id}
                selected={selectedIds?.has(lead.id)}
                onToggleSelect={
                  onToggleSelect
                    ? (selected) => onToggleSelect(lead.id, selected)
                    : undefined
                }
                onEdit={() => onEdit(lead)}
                onStageChange={(stageId) => onStageChange(lead.id, stageId)}
                onToggleFollowUp={(enabled, options) =>
                  onToggleFollowUp(lead.id, enabled, options)
                }
                onAssign={
                  onAssign
                    ? (assigneeId) => onAssign(lead.id, assigneeId)
                    : undefined
                }
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
