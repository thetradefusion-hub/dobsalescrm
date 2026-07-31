'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type {
  Task,
  TaskFilter,
  TaskPriority,
  TaskStats,
  TaskStatus,
} from '@/lib/tasks/types'
import {
  TASK_PAGE_SIZE,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from '@/lib/tasks/types'
import {
  deleteTask,
  fetchTaskStats,
  fetchTasks,
  updateTask,
} from '@/lib/tasks/queries'
import { TaskFormDialog } from '@/components/tasks/task-form-dialog'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  ListTodo,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { localDayKey } from '@/lib/dashboard/date-utils'

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: 'Active' },
  { key: 'today', label: 'Today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
  { key: 'cancelled', label: 'Cancelled' },
]

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const tone: Record<TaskPriority, string> = {
    low: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
    medium: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    high: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    urgent: 'bg-red-500/15 text-red-600 dark:text-red-400',
  }
  return (
    <Badge className={cn('border-0 text-[10px] font-semibold capitalize', tone[priority])}>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  )
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const tone: Record<TaskStatus, string> = {
    todo: 'bg-wa-surface text-wa-muted',
    in_progress: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    done: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    cancelled: 'bg-slate-500/10 text-slate-500 line-through',
  }
  return (
    <Badge className={cn('border-0 text-[10px] font-semibold', tone[status])}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  )
}

function DueLabel({ dueAt, status }: { dueAt?: string | null; status: TaskStatus }) {
  if (!dueAt) return <span className="text-wa-muted">No due date</span>
  const due = new Date(dueAt)
  const now = new Date()
  const open = status === 'todo' || status === 'in_progress'
  const overdue = open && due.getTime() < now.getTime()
  const today = open && localDayKey(due) === localDayKey(now) && !overdue

  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        overdue
          ? 'font-semibold text-red-500'
          : today
            ? 'font-medium text-amber-500'
            : 'text-wa-muted',
      )}
    >
      {due.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
      {overdue ? ' · Overdue' : today ? ' · Today' : ''}
    </span>
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
  value: number
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
          <p className="text-lg font-bold tabular-nums leading-tight text-wa-text">
            {value.toLocaleString()}
          </p>
          <p className="truncate text-[11px] text-wa-muted">{label}</p>
        </div>
      </div>
    </button>
  )
}

export default function TasksPage() {
  const supabase = createClient()

  const [stats, setStats] = useState<TaskStats | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [statsResult, listResult] = await Promise.all([
        fetchTaskStats(supabase),
        fetchTasks(supabase, {
          filter,
          search,
          page,
          priority: priorityFilter,
          assigneeId: assigneeFilter || undefined,
        }),
      ])
      setStats(statsResult)
      setTasks(listResult.tasks)
      setTotal(listResult.total)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks'
      if (message.toLowerCase().includes('relation') || message.includes('42P01')) {
        toast.error('Tasks table missing — run database migrations (020_tasks).')
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, filter, search, page, priorityFilter, assigneeFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void supabase
      .from('profiles')
      .select('*')
      .order('full_name')
      .then(({ data }) => setProfiles((data ?? []) as Profile[]))
  }, [supabase])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setFormOpen(true)
  }

  async function setStatus(task: Task, status: TaskStatus) {
    setBusyId(task.id)
    try {
      await updateTask(supabase, task.id, { status })
      toast.success(
        status === 'done'
          ? 'Task completed'
          : status === 'in_progress'
            ? 'Task started'
            : 'Task updated',
      )
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Delete task “${task.title}”?`)) return
    setBusyId(task.id)
    try {
      await deleteTask(supabase, task.id)
      toast.success('Task deleted')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / TASK_PAGE_SIZE))
  const hasNext = page < totalPages - 1
  const hasPrev = page > 0

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col space-y-4 pb-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-wa-border bg-wa-panel p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:rounded-xl lg:p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-wa-green">
            Sales CRM
          </p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-wa-text sm:text-2xl">
            Tasks
          </h1>
          <p className="mt-1 text-xs text-wa-muted sm:text-sm">
            Follow-ups, calls, demos, and to-dos linked to your sales work.
          </p>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="bg-wa-green text-white hover:bg-wa-teal"
        >
          <Plus className="size-3.5" />
          New task
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Open"
            value={stats.totalOpen}
            icon={<ListTodo className="size-3.5" />}
            accent="bg-wa-surface text-wa-text"
            active={filter === 'all'}
            onClick={() => {
              setFilter('all')
              setPage(0)
            }}
          />
          <StatCard
            label="To do"
            value={stats.todo}
            icon={<Circle className="size-3.5" />}
            accent="bg-blue-500/10 text-blue-500"
            active={filter === 'todo'}
            onClick={() => {
              setFilter('todo')
              setPage(0)
            }}
          />
          <StatCard
            label="In progress"
            value={stats.inProgress}
            icon={<PlayCircle className="size-3.5" />}
            accent="bg-violet-500/10 text-violet-500"
            active={filter === 'in_progress'}
            onClick={() => {
              setFilter('in_progress')
              setPage(0)
            }}
          />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            icon={<AlertTriangle className="size-3.5" />}
            accent="bg-red-500/10 text-red-500"
            active={filter === 'overdue'}
            onClick={() => {
              setFilter('overdue')
              setPage(0)
            }}
          />
          <StatCard
            label="Due today"
            value={stats.dueToday}
            icon={<Clock3 className="size-3.5" />}
            accent="bg-amber-500/10 text-amber-500"
            active={filter === 'today'}
            onClick={() => {
              setFilter('today')
              setPage(0)
            }}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-wa-border bg-wa-panel p-3 shadow-sm lg:rounded-xl lg:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-wa-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Search tasks…"
              className="h-9 border-wa-border bg-wa-surface pl-8 text-xs text-wa-text"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as TaskPriority | 'all')
              setPage(0)
            }}
            className="h-9 rounded-lg border border-wa-border bg-wa-surface px-2.5 text-xs text-wa-text"
          >
            <option value="all">All priorities</option>
            {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => {
              setAssigneeFilter(e.target.value)
              setPage(0)
            }}
            className="h-9 rounded-lg border border-wa-border bg-wa-surface px-2.5 text-xs text-wa-text"
          >
            <option value="">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1 border-t border-wa-border pt-3">
          {FILTERS.map((f) => (
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
                  : 'bg-wa-surface text-wa-muted hover:text-wa-text',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-wa-border bg-wa-panel shadow-sm lg:rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-wa-border bg-wa-surface/30 hover:bg-wa-surface/30">
              <TableHead className="text-wa-muted">Task</TableHead>
              <TableHead className="text-wa-muted">Status</TableHead>
              <TableHead className="text-wa-muted">Priority</TableHead>
              <TableHead className="hidden text-wa-muted md:table-cell">
                Contact
              </TableHead>
              <TableHead className="hidden text-wa-muted lg:table-cell">
                Assignee
              </TableHead>
              <TableHead className="text-wa-muted">Due</TableHead>
              <TableHead className="w-12 text-wa-muted" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-wa-border">
                <TableCell colSpan={7} className="py-14 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-wa-green" />
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow className="border-wa-border">
                <TableCell colSpan={7} className="py-14 text-center">
                  <ListTodo className="mx-auto mb-2 size-8 text-wa-muted/50" />
                  <p className="text-sm font-medium text-wa-text">No tasks yet</p>
                  <p className="mt-1 text-xs text-wa-muted">
                    Create a follow-up or to-do to get started.
                  </p>
                  <Button
                    variant="link"
                    onClick={openCreate}
                    className="mt-2 text-wa-green"
                  >
                    Create your first task
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="border-wa-border hover:bg-wa-surface/30"
                >
                  <TableCell>
                    <div className="min-w-0 max-w-[18rem]">
                      <p
                        className={cn(
                          'font-medium text-wa-text',
                          task.status === 'done' && 'text-wa-muted line-through',
                        )}
                      >
                        {task.title}
                      </p>
                      {task.description ? (
                        <p className="truncate text-xs text-wa-muted">
                          {task.description}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={task.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={task.priority} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {task.contact ? (
                      <div>
                        <p className="text-sm text-wa-text">
                          {task.contact.name || task.contact.phone}
                        </p>
                        {task.contact.phone && task.contact.name ? (
                          <p className="text-[11px] text-wa-muted">
                            {task.contact.phone}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-wa-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm text-wa-text/90 lg:table-cell">
                    {task.assignee?.full_name ||
                      task.assignee?.email ||
                      '—'}
                  </TableCell>
                  <TableCell>
                    <DueLabel dueAt={task.due_at} status={task.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busyId === task.id}
                            className="size-8 text-wa-muted hover:text-wa-text"
                          />
                        }
                      >
                        {busyId === task.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="size-4" />
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="border-wa-border bg-wa-panel">
                        <DropdownMenuItem
                          onClick={() => openEdit(task)}
                          className="text-wa-text/90"
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        {task.status !== 'in_progress' &&
                          task.status !== 'done' && (
                            <DropdownMenuItem
                              onClick={() =>
                                void setStatus(task, 'in_progress')
                              }
                              className="text-wa-text/90"
                            >
                              <PlayCircle className="size-4" />
                              Start
                            </DropdownMenuItem>
                          )}
                        {task.status !== 'done' && (
                          <DropdownMenuItem
                            onClick={() => void setStatus(task, 'done')}
                            className="text-wa-text/90"
                          >
                            <CheckCircle2 className="size-4" />
                            Mark done
                          </DropdownMenuItem>
                        )}
                        {task.status === 'done' && (
                          <DropdownMenuItem
                            onClick={() => void setStatus(task, 'todo')}
                            className="text-wa-text/90"
                          >
                            <Circle className="size-4" />
                            Reopen
                          </DropdownMenuItem>
                        )}
                        {task.contact_id && (
                          <DropdownMenuItem
                            render={
                              <Link
                                href={`/inbox?contact=${task.contact_id}`}
                                className="text-wa-text/90"
                              />
                            }
                          >
                            Open chat
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-wa-border" />
                        <DropdownMenuItem
                          onClick={() => void handleDelete(task)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
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
            Page {page + 1} of {totalPages} · {total} tasks
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

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        onSaved={() => void refresh()}
      />
    </div>
  )
}
