import type { SupabaseClient } from '@supabase/supabase-js'
import { localDayKey, startOfLocalDay } from '@/lib/dashboard/date-utils'
import type {
  Task,
  TaskFilter,
  TaskInput,
  TaskQueryOptions,
  TaskStats,
  TaskStatus,
} from './types'
import { TASK_PAGE_SIZE } from './types'

const TASK_SELECT =
  '*, contact:contacts(id, name, phone, company), deal:deals(id, title, status), assignee:profiles!tasks_assigned_to_fkey(*)'

type DB = SupabaseClient

function endOfLocalDay(d = new Date()): Date {
  const out = startOfLocalDay(d)
  out.setDate(out.getDate() + 1)
  return out
}

export async function fetchTaskStats(db: DB): Promise<TaskStats> {
  const { data, error } = await db
    .from('tasks')
    .select('status, due_at')
    .neq('status', 'cancelled')

  if (error) throw new Error(error.message)

  const now = new Date()
  const todayKey = localDayKey(now)
  const stats: TaskStats = {
    totalOpen: 0,
    todo: 0,
    inProgress: 0,
    done: 0,
    overdue: 0,
    dueToday: 0,
  }

  for (const row of data ?? []) {
    const status = row.status as TaskStatus
    if (status === 'todo') {
      stats.todo++
      stats.totalOpen++
    } else if (status === 'in_progress') {
      stats.inProgress++
      stats.totalOpen++
    } else if (status === 'done') {
      stats.done++
    }

    if (
      row.due_at &&
      (status === 'todo' || status === 'in_progress')
    ) {
      const due = new Date(row.due_at)
      if (due.getTime() < now.getTime()) stats.overdue++
      else if (localDayKey(due) === todayKey) stats.dueToday++
    }
  }

  return stats
}

export async function fetchTasks(
  db: DB,
  options: TaskQueryOptions,
): Promise<{ tasks: Task[]; total: number }> {
  const pageSize = options.pageSize ?? TASK_PAGE_SIZE
  const from = options.page * pageSize
  const to = from + pageSize - 1

  let query = db
    .from('tasks')
    .select(TASK_SELECT, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)

  const nowIso = new Date().toISOString()
  const todayStart = startOfLocalDay().toISOString()
  const tomorrowStart = endOfLocalDay().toISOString()

  switch (options.filter as TaskFilter) {
    case 'todo':
      query = query.eq('status', 'todo')
      break
    case 'in_progress':
      query = query.eq('status', 'in_progress')
      break
    case 'done':
      query = query.eq('status', 'done')
      break
    case 'cancelled':
      query = query.eq('status', 'cancelled')
      break
    case 'overdue':
      query = query
        .in('status', ['todo', 'in_progress'])
        .not('due_at', 'is', null)
        .lt('due_at', nowIso)
      break
    case 'today':
      query = query
        .in('status', ['todo', 'in_progress'])
        .gte('due_at', todayStart)
        .lt('due_at', tomorrowStart)
      break
    case 'all':
    default:
      query = query.neq('status', 'cancelled')
      break
  }

  if (options.priority && options.priority !== 'all') {
    query = query.eq('priority', options.priority)
  }

  if (options.assigneeId === 'unassigned') {
    query = query.is('assigned_to', null)
  } else if (options.assigneeId) {
    query = query.eq('assigned_to', options.assigneeId)
  }

  const term = options.search?.trim()
  if (term) {
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%`,
    )
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  const tasks = normalizeTasks(data ?? []).sort((a, b) => {
    // Open tasks with earlier due dates first; undated last among open.
    const aOpen = a.status === 'todo' || a.status === 'in_progress'
    const bOpen = b.status === 'todo' || b.status === 'in_progress'
    if (aOpen !== bOpen) return aOpen ? -1 : 1
    if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at)
    if (a.due_at) return -1
    if (b.due_at) return 1
    return b.updated_at.localeCompare(a.updated_at)
  })

  return {
    tasks,
    total: count ?? 0,
  }
}

function normalizeTasks(rows: unknown[]): Task[] {
  return rows.map((raw) => {
    const row = raw as Task & {
      contact?: Task['contact'] | Task['contact'][]
      deal?: Task['deal'] | Task['deal'][]
      assignee?: Task['assignee'] | Task['assignee'][]
    }
    return {
      ...row,
      contact: Array.isArray(row.contact) ? row.contact[0] ?? null : row.contact ?? null,
      deal: Array.isArray(row.deal) ? row.deal[0] ?? null : row.deal ?? null,
      assignee: Array.isArray(row.assignee)
        ? row.assignee[0] ?? null
        : row.assignee ?? null,
    }
  })
}

export async function createTask(
  db: DB,
  userId: string,
  input: TaskInput,
): Promise<Task> {
  const title = input.title.trim()
  if (!title) throw new Error('Title is required')

  const { data, error } = await db
    .from('tasks')
    .insert({
      user_id: userId,
      title,
      description: input.description?.trim() || null,
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      due_at: input.due_at || null,
      assigned_to: input.assigned_to || null,
      contact_id: input.contact_id || null,
      deal_id: input.deal_id || null,
    })
    .select(TASK_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return normalizeTasks([data])[0]
}

export async function updateTask(
  db: DB,
  taskId: string,
  input: Partial<TaskInput> & { status?: TaskStatus },
): Promise<Task> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) {
    const title = input.title.trim()
    if (!title) throw new Error('Title is required')
    patch.title = title
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null
  }
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.due_at !== undefined) patch.due_at = input.due_at || null
  if (input.assigned_to !== undefined) {
    patch.assigned_to = input.assigned_to || null
  }
  if (input.contact_id !== undefined) {
    patch.contact_id = input.contact_id || null
  }
  if (input.deal_id !== undefined) patch.deal_id = input.deal_id || null

  if (input.status !== undefined) {
    patch.status = input.status
    patch.completed_at =
      input.status === 'done' ? new Date().toISOString() : null
  }

  const { data, error } = await db
    .from('tasks')
    .update(patch)
    .eq('id', taskId)
    .select(TASK_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return normalizeTasks([data])[0]
}

export async function deleteTask(db: DB, taskId: string): Promise<void> {
  const { error } = await db.from('tasks').delete().eq('id', taskId)
  if (error) throw new Error(error.message)
}
