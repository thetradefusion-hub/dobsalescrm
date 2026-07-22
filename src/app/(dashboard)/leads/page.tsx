'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Pipeline, PipelineStage, Profile } from '@/types'
import type { Lead, LeadFilter, LeadStats } from '@/lib/leads/types'
import {
  fetchLeadStats,
  fetchLeads,
  LEADS_PAGE_SIZE,
  updateLeadStage,
} from '@/lib/leads/queries'
import { formatFollowUp } from '@/lib/leads/format-follow-up'
import { ensurePipelineLeadStages, dedupeStagesByName } from '@/lib/leads/pipeline-stages'
import { LeadStageSelect } from '@/components/leads/lead-stage-select'
import { LeadPriorityBadge } from '@/components/leads/lead-priority-badge'
import { CreateLeadDialog } from '@/components/leads/create-lead-dialog'
import { DealForm } from '@/components/pipelines/deal-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Thermometer,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Clock3,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDealCurrency } from '@/lib/currency'

const FILTERS: { key: LeadFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hot', label: 'Hot' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'warm', label: 'Warm' },
  { key: 'cold', label: 'Cold' },
  { key: 'unqualified', label: 'New' },
  { key: 'won', label: 'Won' },
  { key: 'not_interested', label: 'Not Interested' },
  { key: 'lost', label: 'Lost' },
]

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
      className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
        active
          ? 'border-wa-green/40 bg-wa-green/5'
          : 'border-wa-border bg-wa-panel hover:bg-wa-surface/40'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${accent}`}
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
  'h-8 min-w-0 flex-1 rounded-md border border-wa-border bg-wa-surface px-2 text-xs text-wa-text outline-none focus:border-wa-green sm:flex-none sm:w-[140px]'

export default function LeadsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const initialFilter = useMemo((): LeadFilter => {
    const f = searchParams.get('filter')
    if (
      f === 'hot' ||
      f === 'warm' ||
      f === 'cold' ||
      f === 'overdue' ||
      f === 'unqualified' ||
      f === 'all' ||
      f === 'won' ||
      f === 'lost' ||
      f === 'not_interested'
    ) {
      return f
    }
    return 'all'
  }, [searchParams])

  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LeadFilter>(initialFilter)
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
  const [dealFormOpen, setDealFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Lead | null>(null)

  useEffect(() => {
    setFilter(initialFilter)
    setPage(0)
  }, [initialFilter])

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

    // Ensure Not Interested / Lost / Won exist on every pipeline
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

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [statsResult, leadsResult] = await Promise.all([
        fetchLeadStats(supabase),
        fetchLeads(supabase, {
          filter,
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
  }, [supabase, filter, search, page, stageFilter, assigneeFilter, priorityFilter])

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

  async function handleStageChange(leadId: string, stageId: string) {
    const stage = stages.find((s) => s.id === stageId)
    setUpdatingStageId(leadId)
    try {
      const result = await updateLeadStage(supabase, leadId, stageId, {
        stageName: stage?.name,
      })

      const viewingOpen =
        filter !== 'won' && filter !== 'lost' && filter !== 'not_interested'

      if (viewingOpen && result.status !== 'open') {
        setLeads((current) => current.filter((lead) => lead.id !== leadId))
        setTotal((t) => Math.max(0, t - 1))
        toast.success(
          result.status === 'won'
            ? 'Marked as Won'
            : stage?.name?.toLowerCase().includes('not interested')
              ? 'Marked as Not Interested'
              : 'Marked as Lost',
        )
      } else {
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
      }
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

  const totalPages = Math.ceil(total / LEADS_PAGE_SIZE)
  const hasNext = page < totalPages - 1
  const hasPrev = page > 0

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-wa-text sm:text-2xl">Leads</h1>
          <p className="mt-0.5 text-xs text-wa-muted sm:text-sm">
            Open opportunities synced with contacts & pipeline
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
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-wa-bubble-out text-wa-text hover:bg-wa-teal hover:text-white"
          >
            <Plus className="size-3.5" />
            New Lead
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total Leads"
            value={stats.total}
            icon={<Target className="size-3.5" />}
            accent="bg-wa-surface text-wa-text/90"
            active={filter === 'all'}
            onClick={() => {
              setFilter('all')
              setPage(0)
            }}
          />
          <StatCard
            label="Hot Leads"
            value={stats.hot}
            icon={<Flame className="size-3.5" />}
            accent="bg-red-500/10 text-red-400"
            active={filter === 'hot'}
            onClick={() => {
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
            label="Overdue Follow-ups"
            value={stats.overdueFollowUps}
            icon={<Clock3 className="size-3.5" />}
            accent="bg-amber-500/10 text-amber-400"
            active={filter === 'overdue'}
            onClick={() => {
              setFilter('overdue')
              setPage(0)
            }}
          />
          <StatCard
            label="Warm + Cold"
            value={stats.warm + stats.cold}
            icon={<Thermometer className="size-3.5" />}
            accent="bg-yellow-500/10 text-yellow-400"
            active={filter === 'warm' || filter === 'cold'}
            onClick={() => {
              setFilter('warm')
              setPage(0)
            }}
          />
        </div>
      )}

      {/* Compact filter bar — one row on desktop, wrap on mobile */}
      <div className="flex flex-col gap-2 rounded-lg border border-wa-border bg-wa-panel px-2.5 py-2 sm:flex-row sm:items-center sm:gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-wa-muted/80" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Search inquiry, contact, phone..."
            className="h-8 border-wa-border bg-wa-surface pl-7 text-xs text-wa-text"
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

        <div className="flex flex-wrap items-center gap-1 border-t border-wa-border/60 pt-2 sm:border-l sm:border-t-0 sm:pl-2 sm:pt-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFilter(f.key)
                setPage(0)
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filter === f.key
                  ? 'bg-wa-green text-white'
                  : 'bg-wa-surface text-wa-muted hover:bg-wa-surface/80 hover:text-wa-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-wa-border bg-wa-panel">
        <Table>
          <TableHeader>
            <TableRow className="border-wa-border hover:bg-transparent">
              <TableHead className="text-wa-muted">Contact</TableHead>
              <TableHead className="text-wa-muted">Lead</TableHead>
              <TableHead className="text-wa-muted">Stage</TableHead>
              <TableHead className="text-wa-muted">Priority</TableHead>
              <TableHead className="text-wa-muted hidden md:table-cell">
                Assign
              </TableHead>
              <TableHead className="text-wa-muted hidden lg:table-cell">
                Value
              </TableHead>
              <TableHead className="text-wa-muted">
                Follow-up
              </TableHead>
              <TableHead className="w-12 text-wa-muted" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-wa-border">
                <TableCell colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-wa-green" />
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow className="border-wa-border">
                <TableCell colSpan={7} className="py-12 text-center">
                  <p className="text-sm text-wa-muted">No leads found.</p>
                  <Button
                    variant="link"
                    onClick={() => setCreateOpen(true)}
                    className="mt-2 text-wa-green"
                  >
                    Create your first lead
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} className="border-wa-border">
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
                      <p>{lead.title}</p>
                      {lead.contact?.company ? (
                        <p className="text-xs text-wa-muted">{lead.contact.company}</p>
                      ) : null}
                    </div>
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
                      onChange={(stageId) => void handleStageChange(lead.id, stageId)}
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
                  <TableCell className="hidden text-wa-text/90 lg:table-cell">
                    {formatDealCurrency(lead.value, lead.currency)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(() => {
                      const followUp = formatFollowUp(lead.follow_up_at)
                      return (
                        <span
                          className={
                            followUp.tone === 'overdue'
                              ? 'text-red-400'
                              : followUp.tone === 'soon'
                                ? 'text-amber-400'
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-wa-muted">
            Page {page + 1} of {totalPages} · {total} leads
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => p - 1)}
              className="border-wa-border"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
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
