import type { Lead } from '@/lib/leads/types'
import {
  isFollowUpDueToday,
  isFollowUpOverdue,
} from '@/lib/leads/format-follow-up'

export type StageFollowUpStats = {
  /** Follow-ups due later today (not yet past). */
  today: number
  /** Follow-up time already passed. */
  expired: number
  /** Any lead with a follow_up_at set. */
  scheduled: number
}

/** Per-stage follow-up pulse for accordion headers. */
export function countStageFollowUps(
  leads: Pick<Lead, 'follow_up_at'>[],
  now = new Date(),
): StageFollowUpStats {
  let today = 0
  let expired = 0
  let scheduled = 0

  for (const lead of leads) {
    if (!lead.follow_up_at) continue
    scheduled += 1
    if (isFollowUpOverdue(lead.follow_up_at, now)) {
      expired += 1
      continue
    }
    if (isFollowUpDueToday(lead.follow_up_at, now)) {
      today += 1
    }
  }

  return { today, expired, scheduled }
}
