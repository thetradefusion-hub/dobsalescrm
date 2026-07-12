import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fakeWhatsAppMessageId,
  resolveRealApiCap,
  resolveWhatsAppSimulation,
} from './simulation'

describe('whatsapp simulation helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('cookie wins over env', () => {
    vi.stubEnv('WHATSAPP_SIMULATION', 'true')
    expect(resolveWhatsAppSimulation('0')).toBe(false)
    expect(resolveWhatsAppSimulation('1')).toBe(true)
  })

  it('falls back to env when cookie unset', () => {
    vi.stubEnv('WHATSAPP_SIMULATION', 'true')
    expect(resolveWhatsAppSimulation(null)).toBe(true)
    expect(resolveWhatsAppSimulation(undefined)).toBe(true)
    vi.stubEnv('WHATSAPP_SIMULATION', '0')
    expect(resolveWhatsAppSimulation(null)).toBe(false)
  })

  it('resolveRealApiCap parses limit or unlimited', () => {
    expect(resolveRealApiCap(null)).toBeNull()
    expect(resolveRealApiCap('')).toBeNull()
    expect(resolveRealApiCap('5')).toBe(5)
    expect(resolveRealApiCap('0')).toBe(0)
    expect(resolveRealApiCap('-1')).toBeNull()
  })

  it('fakeWhatsAppMessageId returns a sim-prefixed id', () => {
    const id = fakeWhatsAppMessageId()
    expect(id.startsWith('wamid.sim.')).toBe(true)
    expect(id.length).toBeGreaterThan(20)
  })
})
