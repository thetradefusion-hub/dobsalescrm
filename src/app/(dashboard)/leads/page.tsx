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
  LEADS_PAGE_SIZE,
  updateLeadStage,
} from '@/lib/leads/queries'
import { formatFollowUp } from '@/lib/leads/format-follow-up'
import {
  ensurePipelineLeadStages,
  dedupeStagesByName,
} from '@/lib/leads/pipeline-stages'
import { LeadStageSelect } from '@/components/leads/lead-stage-select'
import { LeadPriorityBadge } from '@/components/leads/lead-priority-badge'
import { CreateLeadDialog } from '@/components/leads/create-lead-dialog'
import { ImportLeadsDialog } from '@/components/leads/import-leads-dialog'
import { DealForm } from '@/components/pipelines/deal-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Flame,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Target,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Clock3,
  TrendingUp,
  Trophy,
  IndianRupee,
  XCircle,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDealCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

const STATUS_SCOPES: { key: LeadStatusScope; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'all', label: 'All' },
]

const TEMP_FILTERS: { key: LeadFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hot', label: 'Hot' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'warm', label: 'Warm' },
  { key: 'cold', label: 'Cold' },
  { key: 'unqualified', label: 'New' },
  { key: 'not_interested', label: 'Not Interested' },
]

function StatusBadge({ status }: { status?: string | null }) {
  if (status === 'won') {
    return (
      <Badge className="border-0 bg-emerald-500/15 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
        Won
      </Badge>
    )
  }
  if (status === 'lost') {
    return (
      <Badge className="border-0 bg-red-500/15 text-[10px] font-semibold text-red-600 dark:text-red-400">
        Lost
      </Badge>
    )
  }
  return (
    <Badge className="border-0 bg-blue-500/15 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
      Open
    </Badge>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
  active,
  onClick,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 py-3 text-left transition-all',
        active
          ? 'border-wa-green/40 bg-wa-green/5 shadow-sm'
          : 'border-wa-border bg-wa-panel hover:border-wa-green/25 hover:bg-wa-surface/40',
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            accent,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold tabular-nums leading-tight text-wa-text">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="truncate text-[11px] text-wa-muted">{label}</p>
        </div>
      </div>
    </button>
  )
}

const selectClass =
  'h-9 min-w-0 flex-1 rounded-lg border border-wa-border bg-wa-surface px-2.5 text-xs text-wa-text outline-none focus:border-wa-green sm:flex-none sm:w-[150px]'

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

  const initialFilter = useMemo(
    () => filterFromSearchParam(searchParams.get('filter')),
    [searchParams],
  )

  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [stageFilter, setStageFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<
    'all' | 'hot' | 'warm' | 'cold' | 'unqualified'
  >('all')

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [dealFormOpen, setDealFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Lead | null>(null)

  useEffect(() => {
    const f = filterFromSearchParam(searchParams.get('filter'))
    setStatusScope(scopeFromFilter(f))
    setFilter(
      f === 'won' || f === 'lost' || f === 'everything' ? 'all' : f,
    )
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
    const { data } = await supabase.from('profiles').select('*').order('full_name')
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
    if (filter === 'hot' || filter === 'warm' || filter === 'cold' || filter === 'unqualified') {
      return filter
    }
    return 'all'
  }, [filter])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [statsResult, leadsResult] = await Promise.all([
        fetchLeadStats(supabase),
        fetchLeads(supabase, {
          filter: queryFilter,
          statusScope,
          search,
          page,
          stageId: stageFilter || undefined,
          assigneeId: assigneeFilter || undefined,
          priority: priorityFilter,
        }),
      ])
      setStats(statsResult)
      setLeads(leadsResult.leads)
      setTotal(leadsResult.total)
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

  async function handleStageChange(leadId: string, stageId: string) {
    const stage = stages.find((s) => s.id === stageId)
    setUpdatingStageId(leadId)
    try {
      const result = await updateLeadStage(supabase, leadId, stageId, {
        stageName: stage?.name,
      })

      // Won/Lost from Open view: switch scope so the lead stays visible (not "deleted").
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
              }
            : lead,
        ),
      )
      toast.success('Lead stage updated')
      void fetchLeadStats(supabase).then(setStats).catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update stage')
    } finally {
      setUpdatingStageId(null)
    }
  }

  const visibleStages = useMemo(() => {
    if (!selectedPipelineId) return stages
    return stages.filter((stage) => stage.pipeline_id === selectedPipelineId)
  }, [stages, selectedPipelineId])

  const totalPages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE))
  const hasNext = page < totalPages - 1
  const hasPrev = page > 0

  const scopeLabel =
    statusScope === 'open'
      ? 'Open pipeline'
      : statusScope === 'won'
        ? 'Won leads'
        : statusScope === 'lost'
          ? 'Lost / closed'
          : 'All leads'

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col space-y-4 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-wa-border bg-wa-panel p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:rounded-xl lg:p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-wa-green">
            Sales CRM
          </p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-wa-text sm:text-2xl">
            Leads
          </h1>
          <p className="mt-1 text-xs text-wa-muted sm:text-sm">
            Manage open opportunities, wins, and losses — synced with pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/pipelines" />}
            className="border-wa-border text-wa-text/90"
          >
            <GitBranch className="size-3.5" />
            Pipeline
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="border-wa-border text-wa-text/90"
          >
            <Upload className="size-3.5" />
            Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-wa-green text-white hover:bg-wa-teal"
          >
            <Plus className="size-3.5" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Open Leads"
            value={stats.total}
            icon={<Target className="size-3.5" />}
            accent="bg-wa-surface text-wa-text/90"
            active={statusScope === 'open' && filter === 'all'}
            onClick={() => {
              setScope('open')
              setFilter('all')
            }}
          />
          <StatCard
            label="Hot"
            value={stats.hot}
            icon={<Flame className="size-3.5" />}
            accent="bg-red-500/10 text-red-400"
            active={filter === 'hot'}
            onClick={() => {
              setScope('open')
              setFilter('hot')
              setPage(0)
            }}
          />
          <StatCard
            label="Pipeline Value"
            value={formatDealCurrency(stats.pipelineValue)}
            icon={<TrendingUp className="size-3.5" />}
            accent="bg-blue-500/10 text-blue-400"
          />
          <StatCard
            label="Overdue"
            value={stats.overdueFollowUps}
            icon={<Clock3 className="size-3.5" />}
            accent="bg-amber-500/10 text-amber-400"
            active={filter === 'overdue'}
            onClick={() => {
              setScope('open')
              setFilter('overdue')
              setPage(0)
            }}
          />
          <StatCard
            label="Won"
            value={stats.wonCount}
            icon={<Trophy className="size-3.5" />}
            accent="bg-emerald-500/10 text-emerald-500"
            active={statusScope === 'won'}
            onClick={() => setScope('won')}
          />
          <StatCard
            label="Won Revenue"
            value={formatDealCurrency(stats.wonRevenue)}
            icon={<IndianRupee className="size-3.5" />}
            accent="bg-wa-green/10 text-wa-green"
            active={statusScope === 'won'}
            onClick={() => setScope('won')}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-wa-border bg-wa-panel p-3 shadow-sm lg:rounded-xl lg:p-4">
        {/* Status scope — Open / Won / Lost / All */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-wa-text">{scopeLabel}</p>
            <p className="text-[11px] text-wa-muted">
              {total.toLocaleString()} lead{total === 1 ? '' : 's'} in this view
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-wa-surface/70 p-1">
            {STATUS_SCOPES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setScope(s.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  statusScope === s.key
                    ? 'bg-wa-green text-white shadow-sm'
                    : 'text-wa-muted hover:bg-wa-elevated/50 hover:text-wa-text',
                )}
              >
                {s.label}
                {s.key === 'won' && stats ? (
                  <span className="ml-1 opacity-80">({stats.wonCount})</span>
                ) : null}
                {s.key === 'lost' && stats ? (
                  <span className="ml-1 opacity-80">({stats.lostCount})</span>
                ) : null}
                {s.key === 'open' && stats ? (
                  <span className="ml-1 opacity-80">({stats.total})</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-wa-border pt-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-wa-muted/80" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Search lead, contact, phone, company…"
              className="h-9 border-wa-border bg-wa-surface pl-8 text-xs text-wa-text"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value)
                setPage(0)
              }}
              className={selectClass}
            >
              <option value="">All stages</option>
              {visibleStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
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
              className={selectClass}
            >
              <option value="all">All priorities</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="unqualified">New</option>
            </select>
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value)
                setPage(0)
              }}
              className={selectClass}
            >
              <option value="">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {statusScope === 'open' && (
          <div className="flex flex-wrap items-center gap-1 border-t border-wa-border/60 pt-3">
            {TEMP_FILTERS.filter((f) => f.key !== 'not_interested').map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key)
                  setPage(0)
                }}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  filter === f.key
                    ? 'bg-wa-green text-white'
                    : 'bg-wa-surface text-wa-muted hover:bg-wa-surface/80 hover:text-wa-text',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {(statusScope === 'lost' || statusScope === 'all') && (
          <div className="flex flex-wrap items-center gap-1 border-t border-wa-border/60 pt-3">
            <button
              type="button"
              onClick={() => {
                setFilter('all')
                setPage(0)
              }}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                filter === 'all'
                  ? 'bg-wa-green text-white'
                  : 'bg-wa-surface text-wa-muted hover:text-wa-text',
              )}
            >
              All closed
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('not_interested')
                setPage(0)
              }}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                filter === 'not_interested'
                  ? 'bg-wa-green text-white'
                  : 'bg-wa-surface text-wa-muted hover:text-wa-text',
              )}
            >
              <XCircle className="size-3" />
              Not Interested
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-wa-border bg-wa-surface/30 hover:bg-wa-surface/30">
              <TableHead className="text-wa-muted">Contact</TableHead>
              <TableHead className="text-wa-muted">Lead</TableHead>
              <TableHead className="text-wa-muted">Status</TableHead>
              <TableHead className="text-wa-muted">Stage</TableHead>
              <TableHead className="text-wa-muted">Priority</TableHead>
              <TableHead className="hidden text-wa-muted md:table-cell">
                Assign
              </TableHead>
              <TableHead className="hidden text-wa-muted lg:table-cell">
                Value
              </TableHead>
              <TableHead className="text-wa-muted">Follow-up</TableHead>
              <TableHead className="w-12 text-wa-muted" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-wa-border">
                <TableCell colSpan={9} className="py-14 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-wa-green" />
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow className="border-wa-border">
                <TableCell colSpan={9} className="py-14 text-center">
                  <p className="text-sm font-medium text-wa-text">No leads here</p>
                  <p className="mt-1 text-xs text-wa-muted">
                    {statusScope === 'won'
                      ? 'No won leads yet — mark a stage as Won to see them here.'
                      : statusScope === 'lost'
                        ? 'No lost leads in this view.'
                        : 'Create a lead or adjust filters.'}
                  </p>
                  {statusScope === 'open' && (
                    <Button
                      variant="link"
                      onClick={() => setCreateOpen(true)}
                      className="mt-2 text-wa-green"
                    >
                      Create your first lead
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="border-wa-border transition-colors hover:bg-wa-surface/30"
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-wa-text">
                        {lead.contact?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-wa-muted">
                        {lead.contact?.phone ?? '—'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-wa-text/90">
                    <div>
                      <p className="font-medium">{lead.title}</p>
                      {lead.contact?.company ? (
                        <p className="text-xs text-wa-muted">
                          {lead.contact.company}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>
                    <LeadStageSelect
                      stageId={lead.stage_id}
                      stages={dedupeStagesByName(
                        stages.filter(
                          (stage) => stage.pipeline_id === lead.pipeline_id,
                        ),
                      )}
                      disabled={updatingStageId === lead.id}
                      onChange={(stageId) =>
                        void handleStageChange(lead.id, stageId)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <LeadPriorityBadge temperature={lead.lead_temperature} />
                      {lead.lead_score != null ? (
                        <span className="text-[10px] text-wa-muted">
                          Score {lead.lead_score}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-wa-text/90 md:table-cell">
                    {lead.assignee?.full_name || lead.assignee?.email || '—'}
                  </TableCell>
                  <TableCell className="hidden tabular-nums text-wa-text/90 lg:table-cell">
                    {formatDealCurrency(lead.value, lead.currency)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(() => {
                      const followUp = formatFollowUp(lead.follow_up_at)
                      return (
                        <span
                          className={
                            followUp.tone === 'overdue'
                              ? 'font-medium text-red-400'
                              : followUp.tone === 'soon'
                                ? 'font-medium text-amber-400'
                                : 'text-wa-muted'
                          }
                        >
                          {followUp.label}
                        </span>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-wa-muted hover:text-wa-text"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="border-wa-border bg-wa-panel">
                        <DropdownMenuItem
                          onClick={() => openEdit(lead)}
                          className="text-wa-text/90"
                        >
                          <Pencil className="size-4" />
                          Edit lead
                        </DropdownMenuItem>
                        {lead.contact_id && (
                          <DropdownMenuItem
                            render={
                              <Link
                                href={`/inbox?contact=${lead.contact_id}`}
                                className="text-wa-text/90"
                              />
                            }
                          >
                            <MessageSquare className="size-4" />
                            Open chat
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-wa-muted">
            Page {page + 1} of {totalPages} · {total} leads
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev || loading}
              onClick={() => setPage((p) => p - 1)}
              className="border-wa-border"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || loading}
              onClick={() => setPage((p) => p + 1)}
              className="border-wa-border"
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

      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => void refresh()}
        pipelineId={selectedPipelineId || undefined}
      />

      {selectedPipelineId && stages.length > 0 && (
        <DealForm
          open={dealFormOpen}
          onOpenChange={setDealFormOpen}
          deal={editingDeal}
          pipelineId={editingDeal?.pipeline_id ?? selectedPipelineId}
          stages={stages}
          onSaved={() => {
            setEditingDeal(null)
            void refresh()
          }}
        />
      )}
    </div>
  )
}
