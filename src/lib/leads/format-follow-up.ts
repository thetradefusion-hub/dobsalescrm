export interface FollowUpDisplay {
  label: string
  tone: 'default' | 'soon' | 'overdue'
}

/** Relative follow-up label for the leads table. */
export function formatFollowUp(
  followUpAt: string | null | undefined,
  now = new Date(),
): FollowUpDisplay {
  if (!followUpAt) {
    return { label: 'Not set', tone: 'default' }
  }

  const target = new Date(followUpAt)
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays)
    if (overdueDays === 0) {
      return { label: 'today', tone: 'overdue' }
    }
    if (overdueDays === 1) {
      return { label: 'yesterday', tone: 'overdue' }
    }
    return { label: `${overdueDays} days ago`, tone: 'overdue' }
  }

  if (diffDays === 0) {
    return { label: 'today', tone: 'soon' }
  }
  if (diffDays === 1) {
    return { label: 'tomorrow', tone: 'soon' }
  }
  return { label: `in ${diffDays} days`, tone: 'default' }
}

export function isFollowUpOverdue(
  followUpAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!followUpAt) return false
  return new Date(followUpAt).getTime() < now.getTime()
}
