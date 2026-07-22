import type { LeadTemperature } from '@/lib/ai/lead-qualification'
import type { Contact, Deal, PipelineStage, Profile } from '@/types'

/** Open deal with contact + stage — the app's lead view model. */
export type Lead = Deal & {
  contact?: Contact
  stage?: PipelineStage
  assignee?: Profile
}

export type LeadFilter =
  | 'all'
  | 'hot'
  | 'warm'
  | 'cold'
  | 'unqualified'
  | 'overdue'
  | 'won'
  | 'lost'
  | 'not_interested'

export interface LeadStats {
  total: number
  hot: number
  warm: number
  cold: number
  unqualified: number
  pipelineValue: number
  overdueFollowUps: number
}

export interface ContactLeadSummary {
  dealId: string
  title: string
  lead_temperature: LeadTemperature | null
  lead_score: number | null
}

export interface LeadQueryOptions {
  filter: LeadFilter
  search?: string
  page: number
  pageSize?: number
  stageId?: string
  assigneeId?: string
  priority?: LeadTemperature | 'unqualified' | 'all'
}
