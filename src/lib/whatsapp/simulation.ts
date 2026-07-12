/**
 * WhatsApp send simulation for demos / local testing.
 *
 * Settings cookies:
 * - wacrm_wa_simulation — full simulation on/off
 * - wacrm_wa_real_cap — max real Meta sends per broadcast (null = unlimited)
 *
 * When full sim is off and real_cap is N: first N recipients use Meta,
 * the rest are simulated (inbox / funnel still update).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

/** Cookie set by POST /api/whatsapp/simulation */
export const WHATSAPP_SIMULATION_COOKIE = 'wacrm_wa_simulation'
/** Max real Meta sends per broadcast; absent / empty = unlimited */
export const WHATSAPP_REAL_CAP_COOKIE = 'wacrm_wa_real_cap'

function parseBoolFlag(value: string | undefined | null): boolean | null {
  if (value == null || value.trim() === '') return null
  const v = value.trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  if (v === 'false' || v === '0' || v === 'no') return false
  return null
}

function envSimulationDefault(): boolean {
  return parseBoolFlag(process.env.WHATSAPP_SIMULATION) === true
}

/**
 * Resolve full simulation on/off.
 * Cookie (from Settings) wins; env is fallback when cookie is absent.
 */
export function resolveWhatsAppSimulation(
  cookieValue?: string | null,
): boolean {
  const fromCookie = parseBoolFlag(cookieValue)
  if (fromCookie !== null) return fromCookie
  return envSimulationDefault()
}

/**
 * Max real Meta API sends allowed in one broadcast.
 * `null` = unlimited (all real when full simulation is off).
 */
export function resolveRealApiCap(cookieValue?: string | null): number | null {
  if (cookieValue == null || cookieValue.trim() === '') return null
  const n = Number.parseInt(cookieValue.trim(), 10)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** @deprecated Prefer resolveWhatsAppSimulation(cookie) — env-only check. */
export function isWhatsAppSimulation(): boolean {
  return envSimulationDefault()
}

export function fakeWhatsAppMessageId(): string {
  return `wamid.sim.${randomUUID().replace(/-/g, '')}`
}

/** Small delay so the send loop feels like a real API round-trip. */
export async function simulateSendLatency(): Promise<void> {
  const ms = 60 + Math.floor(Math.random() * 140)
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Advance messages + broadcast_recipients through delivered → read,
 * matching the webhook ladder so aggregate triggers update counts.
 */
export async function simulateDeliveryReceipts(
  admin: SupabaseClient,
  messageIds: string[],
): Promise<void> {
  if (messageIds.length === 0) return

  // Stagger so the UI can show progress on broadcast detail / inbox ticks.
  await sleep(1200 + Math.floor(Math.random() * 800))

  const deliveredAt = new Date().toISOString()
  for (const id of messageIds) {
    await admin.from('messages').update({ status: 'delivered' }).eq('message_id', id)
    await admin
      .from('broadcast_recipients')
      .update({ status: 'delivered', delivered_at: deliveredAt })
      .eq('whatsapp_message_id', id)
      .in('status', ['pending', 'sent'])
  }

  await sleep(1800 + Math.floor(Math.random() * 1200))

  const readAt = new Date().toISOString()
  for (const id of messageIds) {
    // ~85% "read" so the funnel looks realistic (not every recipient reads).
    if (Math.random() > 0.85) continue
    await admin.from('messages').update({ status: 'read' }).eq('message_id', id)
    await admin
      .from('broadcast_recipients')
      .update({ status: 'read', read_at: readAt })
      .eq('whatsapp_message_id', id)
      .in('status', ['sent', 'delivered'])
  }
}
