import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeadTemperature } from '@/lib/ai/lead-qualification'
import { createLeadFromContact } from '@/lib/leads/create-from-contact'
import { normalizeLeadSource } from '@/lib/leads/sources'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'

export const LEAD_CSV_TEMPLATE = `phone,name,email,company,title,value,priority,notes,source,follow_up_at
919876543210,Rahul Sharma,rahul@example.com,Acme Corp,Website redesign,150000,hot,Interested in AI chatbot,website,2026-08-15
918765432109,Priya Patel,priya@example.com,Patel Traders,MLM software demo,85000,warm,Call after 5pm,meta_ads,
917654321098,Amit Kumar,,Kumar Industries,New Lead,0,cold,,,
`

export const LEAD_CSV_HEADERS = [
  'phone',
  'name',
  'email',
  'company',
  'title',
  'value',
  'priority',
  'notes',
  'source',
  'follow_up_at',
] as const

export interface LeadCsvRow {
  phone: string
  name?: string
  email?: string
  company?: string
  title?: string
  value?: number
  priority?: LeadTemperature
  notes?: string
  source?: string
  follow_up_at?: string
  line: number
}

export interface LeadImportResult {
  created: number
  skipped: number
  failed: number
  errors: string[]
}

function splitCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values.map((v) => v.replace(/^["']|["']$/g, '').trim())
}

function parsePriority(raw?: string): LeadTemperature | undefined {
  if (!raw) return undefined
  const v = raw.trim().toLowerCase()
  if (v === 'hot' || v === 'warm' || v === 'cold') return v
  return undefined
}

function parseFollowUp(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined
  const d = new Date(raw.trim())
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

/** Parse lead-import CSV. Requires a `phone` column. */
export function parseLeadCsv(text: string): {
  rows: LeadCsvRow[]
  error?: string
} {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { rows: [], error: 'CSV needs a header row and at least one data row.' }
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const phoneIdx = headers.indexOf('phone')
  if (phoneIdx === -1) {
    return {
      rows: [],
      error: 'Missing required column: phone',
    }
  }

  const idx = (name: string) => headers.indexOf(name)
  const nameIdx = idx('name')
  const emailIdx = idx('email')
  const companyIdx = idx('company')
  const titleIdx = idx('title')
  const valueIdx = idx('value')
  const priorityIdx = idx('priority')
  const notesIdx = idx('notes')
  const sourceIdx = idx('source')
  const followIdx = idx('follow_up_at')

  const rows: LeadCsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = splitCsvLine(line)
    const phoneRaw = values[phoneIdx] ?? ''
    const phone = normalizePhone(phoneRaw)
    if (!phone || phone.length < 7) continue

    const valueRaw = valueIdx >= 0 ? values[valueIdx] : ''
    const valueNum = valueRaw ? Number(String(valueRaw).replace(/,/g, '')) : 0

    rows.push({
      phone,
      name: nameIdx >= 0 ? values[nameIdx] || undefined : undefined,
      email: emailIdx >= 0 ? values[emailIdx] || undefined : undefined,
      company: companyIdx >= 0 ? values[companyIdx] || undefined : undefined,
      title: titleIdx >= 0 ? values[titleIdx] || undefined : undefined,
      value: Number.isFinite(valueNum) ? valueNum : 0,
      priority: priorityIdx >= 0 ? parsePriority(values[priorityIdx]) : undefined,
      notes: notesIdx >= 0 ? values[notesIdx] || undefined : undefined,
      source:
        sourceIdx >= 0
          ? normalizeLeadSource(values[sourceIdx]) ?? undefined
          : undefined,
      follow_up_at: followIdx >= 0 ? parseFollowUp(values[followIdx]) : undefined,
      line: i + 1,
    })
  }

  if (rows.length === 0) {
    return {
      rows: [],
      error: 'No valid rows found. Each row needs a valid phone number.',
    }
  }

  return { rows }
}

export function downloadLeadCsvTemplate() {
  const blob = new Blob([LEAD_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'leads-import-template.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function findContactIdByPhone(
  supabase: SupabaseClient,
  userId: string,
  phoneDigits: string,
): Promise<string | null> {
  // Exact match first
  const { data: exact } = await supabase
    .from('contacts')
    .select('id, phone')
    .eq('user_id', userId)
    .eq('phone', phoneDigits)
    .limit(1)
    .maybeSingle()
  if (exact) return exact.id

  // Also try with + prefix variants stored historically
  const { data: withPlus } = await supabase
    .from('contacts')
    .select('id, phone')
    .eq('user_id', userId)
    .eq('phone', `+${phoneDigits}`)
    .limit(1)
    .maybeSingle()
  if (withPlus) return withPlus.id

  // Fallback: last 10 digits match (India-style)
  const last10 = phoneDigits.slice(-10)
  if (last10.length === 10) {
    const { data: candidates } = await supabase
      .from('contacts')
      .select('id, phone')
      .eq('user_id', userId)
      .ilike('phone', `%${last10}`)
      .limit(20)
    for (const c of candidates ?? []) {
      if (normalizePhone(c.phone).endsWith(last10)) return c.id
    }
  }

  return null
}

/**
 * Import leads from parsed CSV rows.
 * Creates contacts when needed; skips if contact already has an open lead.
 */
export async function importLeadsFromRows(
  supabase: SupabaseClient,
  userId: string,
  rows: LeadCsvRow[],
  options?: { pipelineId?: string },
): Promise<LeadImportResult> {
  let created = 0
  let skipped = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      let contactId = await findContactIdByPhone(supabase, userId, row.phone)

      if (!contactId) {
        const { data: contact, error } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            phone: row.phone,
            name: row.name || null,
            email: row.email || null,
            company: row.company || null,
          })
          .select('id')
          .single()

        if (error || !contact) {
          failed++
          errors.push(`Line ${row.line}: contact create failed — ${error?.message ?? 'unknown'}`)
          continue
        }
        contactId = contact.id
      } else if (row.name || row.email || row.company) {
        // Soft-fill empty contact fields
        const { data: existing } = await supabase
          .from('contacts')
          .select('name, email, company')
          .eq('id', contactId)
          .maybeSingle()
        if (existing) {
          const patch: Record<string, string> = {}
          if (!existing.name && row.name) patch.name = row.name
          if (!existing.email && row.email) patch.email = row.email
          if (!existing.company && row.company) patch.company = row.company
          if (Object.keys(patch).length > 0) {
            await supabase.from('contacts').update(patch).eq('id', contactId)
          }
        }
      }

      if (!contactId) {
        failed++
        errors.push(`Line ${row.line}: contact id missing`)
        continue
      }

      const result = await createLeadFromContact(supabase, userId, {
        contactId,
        title: row.title,
        pipelineId: options?.pipelineId,
        leadTemperature: row.priority ?? null,
        value: row.value,
        notes: row.notes,
        source: row.source || 'csv_import',
      })

      if (!result.created) {
        skipped++
        continue
      }

      if (row.follow_up_at) {
        await supabase
          .from('deals')
          .update({ follow_up_at: row.follow_up_at })
          .eq('id', result.dealId)
      }

      created++
    } catch (err) {
      failed++
      errors.push(
        `Line ${row.line}: ${err instanceof Error ? err.message : 'failed'}`,
      )
    }
  }

  return { created, skipped, failed, errors: errors.slice(0, 20) }
}
