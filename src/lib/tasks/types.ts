import type { Contact, Deal, Profile } from '@/types'

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskFilter =
  | 'all'
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'overdue'
  | 'today'
  | 'cancelled'

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  due_at?: string | null
  completed_at?: string | null
  assigned_to?: string | null
  contact_id?: string | null
  deal_id?: string | null
  created_at: string
  updated_at: string
  contact?: Contact | null
  deal?: Pick<Deal, 'id' | 'title' | 'status'> | null
  assignee?: Profile | null
}

export interface TaskStats {
  totalOpen: number
  todo: number
  inProgress: number
  done: number
  overdue: number
  dueToday: number
}

export interface TaskQueryOptions {
  filter: TaskFilter
  search?: string
  page: number
  pageSize?: number
  assigneeId?: string
  priority?: TaskPriority | 'all'
}

export interface TaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_at?: string | null
  assigned_to?: string | null
  contact_id?: string | null
  deal_id?: string | null
}

export const TASK_PAGE_SIZE = 25

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}
