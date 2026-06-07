/**
 * Lead qualification aligned with the agency sales prompt:
 * HOT = budget > ₹30k, timeline < 60 days, serious buyer, clear requirements.
 */

export type LeadTemperature = 'hot' | 'warm' | 'cold'

export interface LeadQualificationExtract {
  title: string
  summary: string
  temperature: LeadTemperature
  score: number
  budget_inr: number | null
  timeline_days: number | null
  service: string | null
  business_type: string | null
  is_serious: boolean
  requirements_clear: boolean
  recommended_next_step: string
  confidence: number
  reasoning: string
}

export const DEFAULT_HOT_BUDGET_INR = 30_000
export const DEFAULT_TIMELINE_MAX_DAYS = 60

export const QUALIFICATION_EXTRACT_PROMPT = `You analyze WhatsApp sales chats for a premium web development & AI automation agency in India (assistant name: Rakesh).

Services: Website, Ecommerce, AI Automation, Custom SaaS, Chatbots, Mobile Apps, Business Automation, Landing Pages, Shopify, WhatsApp Automation.

Output ONLY valid JSON (no markdown):
{
  "title": "short deal title max 60 chars — main service requested",
  "summary": "2-4 sentences in customer's language: need, business type, budget/timeline if mentioned, next step",
  "temperature": "hot" | "warm" | "cold",
  "score": 0-100,
  "budget_inr": number or null (parse lakhs/crore/k — e.g. 50k = 50000, 1L = 100000),
  "timeline_days": number or null (e.g. "2 weeks" = 14, "1 month" = 30),
  "service": "primary service or null",
  "business_type": "string or null",
  "is_serious": true if they want work started, not just browsing,
  "requirements_clear": true if they explained what they need beyond a greeting,
  "recommended_next_step": "one short action for sales",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence why this temperature"
}

QUALIFICATION RULES (apply strictly):
HOT only if ALL are true from the chat:
- budget_inr is at least 30000 (or customer clearly implies ₹30k+ project)
- timeline_days is at most 60 (or urgency within ~2 months)
- is_serious is true
- requirements_clear is true

WARM if: real interest and some details, but missing budget OR timeline OR not fully serious yet.

COLD if: only hi/generic questions/no budget intent/not a fit/spam.

Be factual. Only use information from the chat. Do not invent budget or dates.`

export interface QualificationThresholds {
  hotBudgetInr: number
  timelineMaxDays: number
}

/** Enforce HOT only when agency rules are met (overrides optimistic LLM). */
export function applyAgencyQualificationRules(
  raw: Omit<LeadQualificationExtract, 'temperature' | 'score'> & {
    temperature?: string
    score?: number
  },
  thresholds: QualificationThresholds,
): LeadQualificationExtract {
  const budgetOk =
    raw.budget_inr != null && raw.budget_inr >= thresholds.hotBudgetInr
  const timelineOk =
    raw.timeline_days != null && raw.timeline_days <= thresholds.timelineMaxDays
  const hotEligible =
    budgetOk &&
    timelineOk &&
    raw.is_serious === true &&
    raw.requirements_clear === true

  let temperature: LeadTemperature
  if (hotEligible) {
    temperature = 'hot'
  } else if (
    raw.requirements_clear &&
    (raw.is_serious || raw.service || raw.budget_inr != null)
  ) {
    temperature = 'warm'
  } else {
    temperature = 'cold'
  }

  const score = computeScore(temperature, raw.score, hotEligible)

  return {
    title: raw.title,
    summary: raw.summary,
    temperature,
    score,
    budget_inr: raw.budget_inr,
    timeline_days: raw.timeline_days,
    service: raw.service,
    business_type: raw.business_type,
    is_serious: raw.is_serious,
    requirements_clear: raw.requirements_clear,
    recommended_next_step: raw.recommended_next_step,
    confidence: raw.confidence,
    reasoning: raw.reasoning,
  }
}

function computeScore(
  temperature: LeadTemperature,
  llmScore: number | undefined,
  hotEligible: boolean,
): number {
  const base =
    temperature === 'hot' ? 85 : temperature === 'warm' ? 55 : 25
  if (typeof llmScore === 'number' && !Number.isNaN(llmScore)) {
    const clamped = Math.min(100, Math.max(0, Math.round(llmScore)))
    if (hotEligible && temperature === 'hot') {
      return Math.max(clamped, 70)
    }
    if (temperature === 'cold') {
      return Math.min(clamped, 45)
    }
    return clamped
  }
  return base
}

export function parseQualificationJson(
  raw: string,
  contactName: string | null,
  thresholds: QualificationThresholds,
): LeadQualificationExtract | null {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const p = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    const summary = typeof p.summary === 'string' ? p.summary.trim() : ''
    if (!summary) return null

    const title =
      (typeof p.title === 'string' ? p.title.trim().slice(0, 80) : '') ||
      `Lead: ${contactName ?? 'WhatsApp contact'}`

    const partial = {
      title,
      summary,
      budget_inr: parseBudgetInr(p.budget_inr),
      timeline_days: parseTimelineDays(p.timeline_days),
      service: typeof p.service === 'string' ? p.service.trim() || null : null,
      business_type:
        typeof p.business_type === 'string' ? p.business_type.trim() || null : null,
      is_serious: p.is_serious === true,
      requirements_clear: p.requirements_clear === true,
      recommended_next_step:
        typeof p.recommended_next_step === 'string'
          ? p.recommended_next_step.trim()
          : 'Continue qualification',
      confidence:
        typeof p.confidence === 'number'
          ? Math.min(1, Math.max(0, p.confidence))
          : 0.7,
      reasoning:
        typeof p.reasoning === 'string' ? p.reasoning.trim() : 'AI assessment',
      temperature: typeof p.temperature === 'string' ? p.temperature : undefined,
      score: typeof p.score === 'number' ? p.score : undefined,
    }

    return applyAgencyQualificationRules(partial, thresholds)
  } catch {
    return null
  }
}

function parseBudgetInr(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.round(v)
  if (typeof v !== 'string') return null
  const s = v.toLowerCase().replace(/[,\s]/g, '')
  const lakh = s.match(/(\d+(?:\.\d+)?)\s*l(?:akh)?/i)
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100_000)
  const k = s.match(/(\d+(?:\.\d+)?)\s*k/i)
  if (k) return Math.round(parseFloat(k[1]) * 1000)
  const num = s.match(/(\d+)/)
  if (num) return Math.round(parseFloat(num[1]))
  return null
}

function parseTimelineDays(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.round(v)
  if (typeof v !== 'string') return null
  const s = v.toLowerCase()
  const weeks = s.match(/(\d+)\s*week/)
  if (weeks) return parseInt(weeks[1], 10) * 7
  const months = s.match(/(\d+)\s*month/)
  if (months) return parseInt(months[1], 10) * 30
  const days = s.match(/(\d+)\s*day/)
  if (days) return parseInt(days[1], 10)
  return null
}

export const TEMPERATURE_TAG_NAMES: Record<LeadTemperature, string> = {
  hot: 'Hot Lead',
  warm: 'Warm Lead',
  cold: 'Cold Lead',
}

export function temperatureLabel(t: LeadTemperature): string {
  return t === 'hot' ? 'Hot' : t === 'warm' ? 'Warm' : 'Cold'
}

export function temperatureBadgeClass(t: LeadTemperature): string {
  if (t === 'hot') return 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  if (t === 'warm') return 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
  return 'bg-wa-muted/20 text-wa-muted border-wa-border'
}
