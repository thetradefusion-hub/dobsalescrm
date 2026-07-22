import type { PipelineDonutData } from '@/lib/dashboard/types'
import type { ReportPresetId } from './date-range'

export interface ReportMetricDelta {
  current: number
  previous: number
}

export interface ReportSummary {
  newLeads: ReportMetricDelta
  wonDeals: ReportMetricDelta
  lostDeals: ReportMetricDelta
  revenueWon: ReportMetricDelta
  newContacts: ReportMetricDelta
  messagesSent: ReportMetricDelta
  messagesReceived: ReportMetricDelta
  openPipelineValue: number
  openDealsCount: number
  conversionRate: number | null
  avgDealValue: number
  broadcastsSent: ReportMetricDelta
}

export interface DealsTrendPoint {
  day: string
  created: number
  won: number
  lost: number
}

export interface TemperatureSlice {
  key: 'hot' | 'warm' | 'cold' | 'unqualified'
  label: string
  count: number
  color: string
}

export interface StageBarSlice {
  id: string
  name: string
  color: string
  count: number
  value: number
}

export interface ReportDealRow {
  id: string
  title: string
  value: number
  currency: string | null
  status: string
  lead_temperature: string | null
  stage_name: string | null
  stage_color: string | null
  contact_name: string | null
  created_at: string
  updated_at: string
}

export interface MessagesTrendPoint {
  day: string
  incoming: number
  outgoing: number
}

export interface ReportsBundle {
  rangeLabel: string
  preset: ReportPresetId
  summary: ReportSummary
  dealsTrend: DealsTrendPoint[]
  messagesTrend: MessagesTrendPoint[]
  temperatureBreakdown: TemperatureSlice[]
  newLeadsByStage: StageBarSlice[]
  pipelineSnapshot: PipelineDonutData
  topDeals: ReportDealRow[]
  recentClosed: ReportDealRow[]
}
