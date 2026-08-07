'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Pipeline, PipelineStage, Profile } from '@/types'
import type {
  Lead,
  LeadFilter,
  LeadStats,
  LeadStatusScope,
} from '@/lib/leads/types'
import {
  fetchLeadStats,
  fetchLeads,
  fetchStageCounts,
  updateLeadAssignee,
  updateLeadAssigneesBulk,
  updateLeadStage,
} from '@/lib/leads/queries'
import { setLeadAutoFollowUp } from '@/lib/leads/auto-followup'
import type { FollowUpPresetId } from '@/lib/leads/auto-followup'
import {
  ensurePipelineLeadStages,
  dedupeStagesByName,
} from '@/lib/leads/pipeline-stages'
import { CreateLeadDialog } from '@/components/leads/create-lead-dialog'
import { ImportLeadsDialog } from '@/components/leads/import-leads-dialog'
import { PipelineChevronBar } from '@/components/leads/pipeline-chevron'
import { LeadStageAccordion } from '@/components/leads/lead-board'
import {
  StageChangeNoteDialog,
  type PendingStageChange,
} from '@/components/leads/stage-change-note-dialog'
import { DealForm } from '@/components/pipelines/deal-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CalendarClock,
  Filter,
  Loader2,
  Plus,
  Search,
  Upload,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { canViewAllLeads } from '@/lib/auth/roles'
import { hasPermission } from '@/lib/auth/permissions'

const BOARD_PAGE_SIZE = 100

function filterFromSearchParam(f: string | null): LeadFilter {
  if (
    f === 'hot' ||
    f === 'warm' ||
    f === 'cold' ||
    f === 'overdue' ||
    f === 'unqualified' ||
    f === 'all' ||
    f === 'won' ||
    f === 'lost' ||
    f === 'not_interested' ||
    f === 'everything'
  ) {
    return f
  }
  return 'all'
}

function scopeFromFilter(filter: LeadFilter): LeadStatusScope {
  if (filter === 'won') return 'won'
  if (filter === 'lost' || filter === 'not_interested') return 'lost'
  if (filter === 'everything') return 'all'
  return 'open'
}

export default function LeadsPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, permissions, isAdmin } = useAuth()
  const viewAllLeads = isAdmin || canViewAllLeads(permissions)
  const canImport =
    isAdmin ||
    hasPermission(permissions, 'leads.import') ||
    hasPermission(permissions, '*')
  const canAssign =
    isAdmin ||
    hasPermission(permissions, 'leads.assign') ||
    hasPermission(permissions, '*')

  const initialFilter = useMemo(
    () => filterFromSearchParam(searchParams.get('filter')),
    [searchParams],
  )

  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusScope, setStatusScope] = useState<LeadStatusScope>(() =>
    scopeFromFilter(initialFilter),
  )
  const [filter, setFilter] = useState<LeadFilter>(() =>
    initialFilter === 'won' ||
    initialFilter === 'lost' ||
    initialFilter === 'everything'
      ? 'all'
      : initialFilter,
  )
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [page, setPage] = useState(0)
  const [stageFilter, setStageFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<
    'all' | 'hot' | 'warm' | 'cold' | 'unqualified'
  >('all')
  const [showFilters, setShowFilters] = useState(false)
  const [openStages, setOpenStages] = useState<Set<string>>(new Set())

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAssigneeId, setBulkAssigneeId] = useState('')
  const [bulkAssigning, setBulkAssigning] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [dealFormOpen, setDealFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Lead | null>(null)
  const [pendingStageChange, setPendingStageChange] =
    useState<PendingStageChange | null>(null)

  useEffect(() => {
    const f = filterFromSearchParam(searchParams.get('filter'))
    setStatusScope(scopeFromFilter(f))
    setFilter(f === 'won' || f === 'lost' || f === 'everything' ? 'all' : f)
    const q = searchParams.get('q')
    if (q !== null) setSearch(q)
    setPage(0)
  }, [searchParams])

  const loadPipelines = useCallback(async () => {
    const { data } = await supabase
      .from('pipelines')
      .select('*')
      .order('created_at')
    const list = data ?? []
    setPipelines(list)
    if (list.length > 0) {
      setSelectedPipelineId((prev) =>
        prev && list.some((p) => p.id === prev) ? prev : list[0].id,
      )
    }
  }, [supabase])

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')
    setProfiles((data ?? []) as Profile[])
  }, [supabase])

  const loadStages = useCallback(async () => {
    const { data: pipelinesData } = await supabase
      .from('pipelines')
      .select('id')
      .order('created_at')

    const pipelineIds = (pipelinesData ?? []).map((p) => p.id)
    if (pipelineIds.length === 0) {
      setStages([])
      return
    }

    for (const id of pipelineIds) {
      try {
        await ensurePipelineLeadStages(supabase, id)
      } catch (err) {
        console.error('[leads] ensure stages failed:', err)
      }
    }

    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .in('pipeline_id', pipelineIds)
      .order('position')

    setStages(dedupeStagesByName(data ?? []))
  }, [supabase])

  const queryFilter: LeadFilter = useMemo(() => {
    if (filter === 'not_interested') return 'not_interested'
    if (filter === 'overdue') return 'overdue'
    if (
      filter === 'hot' ||
      filter === 'warm' ||
      filter === 'cold' ||
      filter === 'unqualified'
    ) {
      return filter
    }
    return 'all'
  }, [filter])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const forcedAssignee =
        !viewAllLeads && profile?.id ? profile.id : assigneeFilter || undefined

      const [statsResult, leadsResult, counts] = await Promise.all([
        fetchLeadStats(supabase),
        fetchLeads(supabase, {
          filter: queryFilter,
          statusScope,
          search,
          page,
          pageSize: BOARD_PAGE_SIZE,
          stageId: stageFilter || undefined,
          assigneeId: forcedAssignee,
          priority: priorityFilter,
        }),
        fetchStageCounts(supabase, {
          statusScope,
          pipelineId: selectedPipelineId || undefined,
        }),
      ])
      setStats(statsResult)
      setLeads(leadsResult.leads)
      setTotal(leadsResult.total)
      setStageCounts(counts)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [
    supabase,
    queryFilter,
    statusScope,
    search,
    page,
    stageFilter,
    assigneeFilter,
    priorityFilter,
    selectedPipelineId,
    viewAllLeads,
    profile?.id,
  ])

  useEffect(() => {
    void loadPipelines()
  }, [loadPipelines])

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  useEffect(() => {
    void loadStages()
  }, [loadStages])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Clear bulk selection when list context changes
  useEffect(() => {
    setSelectedIds(new Set())
    setBulkAssigneeId('')
  }, [page, statusScope, filter, search, stageFilter, assigneeFilter, priorityFilter])

  // Auto-expand first stage or active stage filter
  useEffect(() => {
    if (stageFilter) {
      setOpenStages(new Set([stageFilter]))
      return
    }
    const firstWithLeads = stages.find(
      (s) =>
        (!selectedPipelineId || s.pipeline_id === selectedPipelineId) &&
        (stageCounts[s.id] ?? 0) > 0,
    )
    if (firstWithLeads) {
      setOpenStages((prev) =>
        prev.size === 0 ? new Set([firstWithLeads.id]) : prev,
      )
    }
  }, [stageFilter, stages, stageCounts, selectedPipelineId])

  function openEdit(deal: Lead) {
    setEditingDeal(deal)
    setSelectedPipelineId(deal.pipeline_id)
    setDealFormOpen(true)
  }

  function setScope(scope: LeadStatusScope) {
    setStatusScope(scope)
    setPage(0)
    if (filter === 'not_interested' && scope !== 'lost' && scope !== 'all') {
      setFilter('all')
    }
    const url =
      scope === 'won'
        ? '/leads?filter=won'
        : scope === 'lost'
          ? '/leads?filter=lost'
          : scope === 'all'
            ? '/leads?filter=everything'
            : '/leads'
    router.replace(url)
  }

  function requestStageChange(leadId: string, stageId: string) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage_id === stageId) return
    const toStage = stages.find((s) => s.id === stageId)
    if (!toStage) return
    const fromStage =
      stages.find((s) => s.id === lead.stage_id) ?? lead.stage
    setPendingStageChange({
      leadId,
      leadLabel:
        lead.contact?.name?.trim() ||
        lead.contact?.phone ||
        lead.title ||
        'Lead',
      fromStageName: fromStage?.name ?? 'Current',
      toStageId: stageId,
      toStageName: toStage.name,
      currentNotes: lead.notes?.trim() ?? '',
    })
  }

  async function handleStageChange(
    leadId: string,
    stageId: string,
    options?: { notes?: string | null },
  ) {
    const stage = stages.find((s) => s.id === stageId)
    setUpdatingStageId(leadId)
    try {
      const result = await updateLeadStage(supabase, leadId, stageId, {
        stageName: stage?.name,
        ...(options && 'notes' in options ? { notes: options.notes } : {}),
      })

      if (result.status === 'won' && statusScope === 'open') {
        toast.success('Marked as Won — switched to Won view', {
          action: {
            label: 'Open leads',
            onClick: () => setScope('open'),
          },
        })
        setStatusScope('won')
        setFilter('all')
        setPage(0)
        router.replace('/leads?filter=won')
        return
      }

      if (result.status === 'lost' && statusScope === 'open') {
        const isNotInterested = stage?.name
          ?.toLowerCase()
          .includes('not interested')
        toast.success(
          isNotInterested
            ? 'Marked as Not Interested — switched to Lost view'
            : 'Marked as Lost — switched to Lost view',
          {
            action: {
              label: 'Open leads',
              onClick: () => setScope('open'),
            },
          },
        )
        setStatusScope('lost')
        setFilter(isNotInterested ? 'not_interested' : 'all')
        setPage(0)
        router.replace('/leads?filter=lost')
        return
      }

      setLeads((current) =>
        current.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                stage_id: stageId,
                stage: stage ?? lead.stage,
                status: result.status,
                updated_at: new Date().toISOString(),
                ...(options && 'notes' in options
                  ? { notes: options.notes }
                  : {}),
              }
            : lead,
        ),
      )
      toast.success(
        options && 'notes' in options && options.notes
          ? 'Stage & note updated'
          : 'Lead stage updated',
      )
      void fetchLeadStats(supabase).then(setStats).catch(() => {})
      void fetchStageCounts(supabase, {
        statusScope,
        pipelineId: selectedPipelineId || undefined,
      })
        .then(setStageCounts)
        .catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update stage')
    } finally {
      setUpdatingStageId(null)
    }
  }

  async function confirmStageChange(
    notes: string | null,
    updateNotes: boolean,
  ) {
    if (!pendingStageChange) return
    const { leadId, toStageId } = pendingStageChange
    await handleStageChange(
      leadId,
      toStageId,
      updateNotes ? { notes } : undefined,
    )
    setPendingStageChange(null)
  }

  async function handleToggleFollowUp(
    leadId: string,
    enabled: boolean,
    options?: { presetId?: FollowUpPresetId },
  ) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not signed in')

      const result = await setLeadAutoFollowUp(
        supabase,
        session.user.id,
        {
          id: lead.id,
          title: lead.title,
          contact_id: lead.contact_id,
          assigned_to: lead.assigned_to,
          contactName: lead.contact?.name,
        },
        enabled,
        enabled ? { presetId: options?.presetId ?? '1d' } : undefined,
      )

      setLeads((current) =>
        current.map((l) =>
          l.id === leadId ? { ...l, follow_up_at: result.follow_up_at } : l,
        ),
      )
      toast.success(
        enabled
          ? 'Follow-up scheduled + task created'
          : 'Follow-up cleared',
      )
      void fetchLeadStats(supabase).then(setStats).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update follow-up')
      throw err
    }
  }

  async function handleAssign(
    leadId: string,
    assigneeProfileId: string | null,
  ) {
    setAssigningLeadId(leadId)
    try {
      await updateLeadAssignee(supabase, leadId, assigneeProfileId)
      const assignee =
        assigneeProfileId
          ? profiles.find((p) => p.id === assigneeProfileId) ?? null
          : null
      setLeads((current) =>
        current.map((l) =>
          l.id === leadId
            ? {
                ...l,
                assigned_to: assigneeProfileId ?? undefined,
                assignee: assignee ?? undefined,
              }
            : l,
        ),
      )
      toast.success(
        assignee
          ? `Assigned to ${assignee.full_name || assignee.email}`
          : 'Lead unassigned',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign lead')
    } finally {
      setAssigningLeadId(null)
    }
  }

  function toggleSelect(leadId: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(leadId)
      else next.delete(leadId)
      return next
    })
  }

  function toggleSelectStage(leadIds: string[], selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of leadIds) {
        if (selected) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setBulkAssigneeId('')
  }

  async function handleBulkAssign() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkAssigning(true)
    try {
      const assigneeProfileId = bulkAssigneeId || null
      await updateLeadAssigneesBulk(supabase, ids, assigneeProfileId)
      const assignee = assigneeProfileId
        ? profiles.find((p) => p.id === assigneeProfileId) ?? null
        : null
      setLeads((current) =>
        current.map((l) =>
          selectedIds.has(l.id)
            ? {
                ...l,
                assigned_to: assigneeProfileId ?? undefined,
                assignee: assignee ?? undefined,
              }
            : l,
        ),
      )
      toast.success(
        assignee
          ? `${ids.length} lead${ids.length === 1 ? '' : 's'} assigned to ${assignee.full_name || assignee.email}`
          : `${ids.length} lead${ids.length === 1 ? '' : 's'} unassigned`,
      )
      clearSelection()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk assign failed')
    } finally {
      setBulkAssigning(false)
    }
  }

  const visibleStages = useMemo(() => {
    if (!selectedPipelineId) return stages
    return stages.filter((stage) => stage.pipeline_id === selectedPipelineId)
  }, [stages, selectedPipelineId])

  const leadsByStage = useMemo(() => {
    const map = new Map<string, Lead[]>()
    for (const stage of visibleStages) map.set(stage.id, [])
    for (const lead of leads) {
      const key = lead.stage_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(lead)
    }
    return map
  }, [leads, visibleStages])

  const totalPages = Math.max(1, Math.ceil(total / BOARD_PAGE_SIZE))
  const hasNext = page < totalPages - 1
  const hasPrev = page > 0

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-3 overflow-x-hidden bg-[#f8fafc] pb-6 sm:gap-4 dark:bg-saas-bg">
      {/* Top toolbar */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-3 dark:border-saas-border dark:bg-saas-card">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Search Leads"
            className="h-11 rounded-full border-slate-200 bg-slate-50 pl-10 text-sm text-slate-800 shadow-none focus-visible:ring-violet-400 dark:border-saas-border dark:bg-saas-bg dark:text-saas-text"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Filters"
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full border transition',
            showFilters
              ? 'border-violet-300 bg-violet-50 text-violet-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-600',
          )}
        >
          <Filter className="size-4" />
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tasks?filter=due_today"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-2.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 sm:px-3"
          >
            <CalendarClock className="size-3.5" />
            <span className="hidden sm:inline">Call Reminders</span>
            <span className="sm:hidden">Calls</span>
          </Link>
          {canImport ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="h-10 rounded-xl border-sky-200 text-sky-700 hover:bg-sky-50"
            >
              <Upload className="size-3.5" />
              <span className="hidden sm:inline">Import Leads</span>
              <span className="sm:hidden">Import</span>
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="h-10 rounded-xl bg-sky-600 text-white hover:bg-sky-500"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Add New Lead</span>
            <span className="sm:hidden">Add Lead</span>
          </Button>
        </div>
      </div>

      {/* Scope chips */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'open' as const, label: 'Open', count: stats?.total as number | undefined },
            { key: 'won' as const, label: 'Won', count: stats?.wonCount as number | undefined },
            { key: 'lost' as const, label: 'Lost', count: stats?.lostCount as number | undefined },
            { key: 'all' as const, label: 'All', count: undefined as number | undefined },
          ]
        ).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setScope(s.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              statusScope === s.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-violet-700 dark:bg-saas-card dark:ring-saas-border',
            )}
          >
            {s.label}
            {typeof s.count === 'number' ? (
              <span className="ml-1 opacity-80">({s.count})</span>
            ) : null}
          </button>
        ))}
        {pipelines.length > 1 && (
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="ml-auto h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 dark:border-saas-border dark:bg-saas-card"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Chevron pipeline */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-saas-border dark:bg-saas-card">
        <PipelineChevronBar
          stages={visibleStages}
          counts={stageCounts}
          activeStageId={stageFilter || undefined}
          onSelect={(id) => {
            setStageFilter(id)
            setPage(0)
            if (id) setOpenStages(new Set([id]))
          }}
        />
      </div>

      {/* Extra filters drawer */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-saas-border dark:bg-saas-card">
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(
                e.target.value as
                  | 'all'
                  | 'hot'
                  | 'warm'
                  | 'cold'
                  | 'unqualified',
              )
              setPage(0)
            }}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs"
          >
            <option value="all">All priorities</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="unqualified">New</option>
          </select>
          {canAssign ? (
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value)
                setPage(0)
              }}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs"
            >
              <option value="">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setFilter('overdue')
              setScope('open')
              setPage(0)
            }}
            className={cn(
              'rounded-lg px-3 text-xs font-semibold',
              filter === 'overdue'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-50 text-slate-600',
            )}
          >
            Overdue follow-ups
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter('hot')
              setScope('open')
              setPage(0)
            }}
            className={cn(
              'rounded-lg px-3 text-xs font-semibold',
              filter === 'hot'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-50 text-slate-600',
            )}
          >
            Hot only
          </button>
        </div>
      )}

      {/* Bulk assign bar (Admin) */}
      {canAssign && selectedIds.size > 0 ? (
        <div className="sticky top-0 z-20 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50/95 p-3 shadow-md backdrop-blur sm:flex-row sm:items-center dark:border-violet-500/30 dark:bg-violet-950/40">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <UserPlus className="size-4 shrink-0 text-violet-600" />
            <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
              {selectedIds.size} lead{selectedIds.size === 1 ? '' : 's'} selected
            </p>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-100"
            >
              <X className="size-3" />
              Clear
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkAssigneeId}
              onChange={(e) => setBulkAssigneeId(e.target.value)}
              className="h-10 min-w-[12rem] rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-700"
            >
              <option value="">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                  {p.role === 'sales_executive' ? ' (SE)' : ''}
                  {p.role === 'admin' ? ' (Admin)' : ''}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={bulkAssigning}
              onClick={() => void handleBulkAssign()}
              className="h-10 rounded-xl bg-violet-600 text-white hover:bg-violet-500"
            >
              {bulkAssigning ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              Assign selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkAssigning}
              onClick={() => {
                setBulkAssigneeId('')
                void (async () => {
                  setBulkAssigning(true)
                  try {
                    const ids = [...selectedIds]
                    await updateLeadAssigneesBulk(supabase, ids, null)
                    setLeads((current) =>
                      current.map((l) =>
                        selectedIds.has(l.id)
                          ? {
                              ...l,
                              assigned_to: undefined,
                              assignee: undefined,
                            }
                          : l,
                      ),
                    )
                    toast.success(
                      `${ids.length} lead${ids.length === 1 ? '' : 's'} unassigned`,
                    )
                    clearSelection()
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : 'Bulk unassign failed',
                    )
                  } finally {
                    setBulkAssigning(false)
                  }
                })()
              }}
              className="h-10 rounded-xl border-violet-200 text-violet-700"
            >
              Unassign
            </Button>
          </div>
        </div>
      ) : null}

      {/* Accordion board */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-7 animate-spin text-violet-600" />
        </div>
      ) : visibleStages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-saas-border dark:bg-saas-card">
          <p className="text-sm font-medium text-slate-700">No pipeline stages</p>
          <Button
            variant="link"
            nativeButton={false}
            render={<Link href="/pipelines" />}
            className="mt-2 text-violet-600"
          >
            Set up pipeline
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visibleStages
            .filter((s) => !stageFilter || s.id === stageFilter)
            .map((stage) => (
              <LeadStageAccordion
                key={stage.id}
                stage={stage}
                count={stageCounts[stage.id] ?? 0}
                leads={leadsByStage.get(stage.id) ?? []}
                open={openStages.has(stage.id)}
                onToggle={() =>
                  setOpenStages((prev) => {
                    const next = new Set(prev)
                    if (next.has(stage.id)) next.delete(stage.id)
                    else next.add(stage.id)
                    return next
                  })
                }
                stagesForSelect={dedupeStagesByName(
                  stages.filter((s) => s.pipeline_id === stage.pipeline_id),
                )}
                updatingStageId={updatingStageId}
                showAssignee={viewAllLeads || canAssign}
                canAssign={canAssign}
                assignees={profiles}
                assigningLeadId={assigningLeadId}
                selectedIds={selectedIds}
                onToggleSelect={canAssign ? toggleSelect : undefined}
                onToggleSelectStage={canAssign ? toggleSelectStage : undefined}
                onEdit={openEdit}
                onStageChange={(leadId, sid) =>
                  requestStageChange(leadId, sid)
                }
                onToggleFollowUp={handleToggleFollowUp}
                onAssign={canAssign ? handleAssign : undefined}
              />
            ))}
        </div>
      )}

      {total > BOARD_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Page {page + 1} of {totalPages} · {total} leads
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void refresh()}
      />

      <StageChangeNoteDialog
        pending={pendingStageChange}
        open={Boolean(pendingStageChange)}
        saving={
          pendingStageChange
            ? updatingStageId === pendingStageChange.leadId
            : false
        }
        onOpenChange={(open) => {
          if (!open) setPendingStageChange(null)
        }}
        onConfirm={(notes, updateNotes) => {
          void confirmStageChange(notes, updateNotes)
        }}
      />

      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => void refresh()}
        pipelineId={selectedPipelineId || undefined}
      />

      {selectedPipelineId && stages.length > 0 && (
        <DealForm
          open={dealFormOpen}
          onOpenChange={(open) => {
            setDealFormOpen(open)
            if (!open) setEditingDeal(null)
          }}
          pipelineId={selectedPipelineId}
          stages={stages.filter((s) => s.pipeline_id === selectedPipelineId)}
          deal={editingDeal}
          onSaved={() => void refresh()}
        />
      )}
    </div>
  )
}
