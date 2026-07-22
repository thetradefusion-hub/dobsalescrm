/**
 * Seed 5 demo leads (contacts + open deals) for the Leads page.
 * Usage: npx tsx scripts/seed-demo-leads.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const DEMO_PHONES = [
  '+919900000001',
  '+919900000002',
  '+919900000003',
  '+919900000004',
  '+919900000005',
]

function loadEnv(): Record<string, string> {
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) throw new Error('.env.local not found')
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
  }
  return env
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

function findStageByName(
  stages: { id: string; name: string; position: number }[],
  needles: string[],
): string | null {
  const hit = stages.find((s) =>
    needles.some((n) => s.name.toLowerCase().includes(n.toLowerCase())),
  )
  return hit?.id ?? stages[0]?.id ?? null
}

async function main() {
  const env = loadEnv()
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  }

  const db = createClient(url, key)

  const emailArg = process.argv.find((a) => a.startsWith('--email='))?.slice('--email='.length)
  const userIdArg = process.argv.find((a) => a.startsWith('--user-id='))?.slice('--user-id='.length)

  let userId = userIdArg || env.SEED_USER_ID

  if (!userId && emailArg) {
    const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 })
    const match = users?.users?.find(
      (u) => u.email?.toLowerCase() === emailArg.toLowerCase(),
    )
    userId = match?.id
    if (!userId) {
      throw new Error(`No auth user found for email: ${emailArg}`)
    }
  }

  if (!userId) {
    const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 50 })
    if (users?.users?.length === 1) {
      userId = users.users[0].id
    } else {
      console.error('Multiple users found — pass --email=you@example.com or set SEED_USER_ID')
      for (const u of users?.users ?? []) {
        console.error(`  ${u.email}  ${u.id}`)
      }
      throw new Error('Set SEED_USER_ID or pass --email=your-login-email')
    }
  }

  const { data: authUser } = await db.auth.admin.getUserById(userId)
  console.log(`Seeding demo leads for ${authUser.user?.email ?? userId}...`)

  const { data: pipelines } = await db
    .from('pipelines')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)

  let pipelineId = pipelines?.[0]?.id

  if (!pipelineId) {
    const { data: pipeline, error } = await db
      .from('pipelines')
      .insert({ user_id: userId, name: 'Sales Pipeline' })
      .select('id')
      .single()
    if (error || !pipeline) throw new Error(`Failed to create pipeline: ${error?.message}`)
    pipelineId = pipeline.id

    const stages = [
      { name: 'New Lead', color: '#3b82f6', position: 0 },
      { name: 'Qualified', color: '#eab308', position: 1 },
      { name: 'Proposal Sent', color: '#f97316', position: 2 },
      { name: 'Negotiation', color: '#25D366', position: 3 },
      { name: 'Won', color: '#22c55e', position: 4 },
    ]
    await db.from('pipeline_stages').insert(
      stages.map((s) => ({ ...s, pipeline_id: pipelineId })),
    )
    console.log('Created default Sales Pipeline')
  }

  const { data: stages } = await db
    .from('pipeline_stages')
    .select('id, name, position')
    .eq('pipeline_id', pipelineId)
    .order('position')

  if (!stages?.length) {
    throw new Error('Pipeline has no stages')
  }

  const stageNew = findStageByName(stages, ['new lead'])!
  const stageQualified = findStageByName(stages, ['qualified'])!
  const stageProposal = findStageByName(stages, ['proposal'])!
  const stageNegotiation = findStageByName(stages, ['negotiation', 'demo'])!

  const demoLeads = [
    {
      phone: DEMO_PHONES[0],
      name: 'Rohan Mehta',
      company: 'Bangalore',
      email: 'rohan.mehta@example.com',
      title: 'Blockchain Development',
      value: 3_200_000,
      lead_temperature: 'hot' as const,
      lead_score: 88,
      lead_budget_inr: 3_200_000,
      stage_id: stageProposal,
      follow_up_at: daysFromNow(-1),
    },
    {
      phone: DEMO_PHONES[1],
      name: 'Priya Shah',
      company: 'Mumbai',
      email: 'priya.shah@example.com',
      title: 'ERP Implementation',
      value: 12_000_000,
      lead_temperature: 'warm' as const,
      lead_score: 72,
      lead_budget_inr: 12_000_000,
      stage_id: stageNegotiation,
      follow_up_at: daysFromNow(-2),
    },
    {
      phone: DEMO_PHONES[2],
      name: 'Amit Kumar',
      company: 'Delhi',
      email: 'amit.kumar@example.com',
      title: 'Mobile App Development',
      value: 450_000,
      lead_temperature: null,
      lead_score: null,
      lead_budget_inr: null,
      stage_id: stageNew,
      follow_up_at: daysFromNow(4),
    },
    {
      phone: DEMO_PHONES[3],
      name: 'Sneha Reddy',
      company: 'Hyderabad',
      email: 'sneha.reddy@example.com',
      title: 'WhatsApp Automation',
      value: 850_000,
      lead_temperature: 'hot' as const,
      lead_score: 91,
      lead_budget_inr: 850_000,
      stage_id: stageQualified,
      follow_up_at: daysFromNow(0),
    },
    {
      phone: DEMO_PHONES[4],
      name: 'Vikram Singh',
      company: 'Pune',
      email: 'vikram.singh@example.com',
      title: 'Ecommerce Website',
      value: 1_800_000,
      lead_temperature: 'cold' as const,
      lead_score: 35,
      lead_budget_inr: 600_000,
      stage_id: stageNegotiation,
      follow_up_at: daysFromNow(7),
    },
  ]

  let created = 0
  let updated = 0

  for (const lead of demoLeads) {
    const { data: existingContact } = await db
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('phone', lead.phone)
      .maybeSingle()

    let contactId = existingContact?.id

    if (!contactId) {
      const { data: inserted, error } = await db
        .from('contacts')
        .insert({
          user_id: userId,
          phone: lead.phone,
          name: lead.name,
          email: lead.email,
          company: lead.company,
        })
        .select('id')
        .single()
      if (error || !inserted) {
        throw new Error(`Contact insert failed for ${lead.phone}: ${error?.message}`)
      }
      contactId = inserted.id
    } else {
      await db
        .from('contacts')
        .update({
          name: lead.name,
          email: lead.email,
          company: lead.company,
        })
        .eq('id', contactId)
    }

    const now = new Date().toISOString()
    const dealPayload = {
      user_id: userId,
      pipeline_id: pipelineId,
      stage_id: lead.stage_id,
      contact_id: contactId,
      title: lead.title,
      value: lead.value,
      currency: 'INR',
      status: 'open' as const,
      lead_temperature: lead.lead_temperature,
      lead_score: lead.lead_score,
      lead_budget_inr: lead.lead_budget_inr,
      qualified_at: lead.lead_temperature ? now : null,
      follow_up_at: lead.follow_up_at,
      notes: '[Demo seed] Sample lead for Leads dashboard',
      updated_at: now,
    }

    const { data: openDeal } = await db
      .from('deals')
      .select('id')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .eq('status', 'open')
      .maybeSingle()

    if (openDeal) {
      const { error } = await db
        .from('deals')
        .update(dealPayload)
        .eq('id', openDeal.id)
      if (error) throw new Error(`Deal update failed: ${error.message}`)
      updated++
      console.log(`Updated: ${lead.title} (${lead.name})`)
    } else {
      const { error } = await db.from('deals').insert(dealPayload)
      if (error) throw new Error(`Deal insert failed: ${error.message}`)
      created++
      console.log(`Created: ${lead.title} (${lead.name})`)
    }
  }

  console.log(`\nDone — ${created} created, ${updated} updated.`)
  console.log('Open http://localhost:3000/leads (or :3001) to view demo leads.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
