'use client'

import { useCallback, useEffect, useState } from 'react'

export type WhatsAppSimulationSettings = {
  enabled: boolean
  /** Max real Meta sends per broadcast; null = unlimited */
  realCap: number | null
  loading: boolean
  refresh: () => Promise<void>
}

/**
 * Client hook: simulation prefs from /api/whatsapp/simulation (cookie-backed).
 */
export function useWhatsAppSimulation(): WhatsAppSimulationSettings {
  const [enabled, setEnabled] = useState(false)
  const [realCap, setRealCap] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/simulation')
      if (!res.ok) {
        setEnabled(false)
        setRealCap(null)
        return
      }
      const data = (await res.json()) as {
        enabled?: boolean
        realCap?: number | null
      }
      setEnabled(Boolean(data.enabled))
      setRealCap(
        typeof data.realCap === 'number' && Number.isFinite(data.realCap)
          ? data.realCap
          : null,
      )
    } catch {
      setEnabled(false)
      setRealCap(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { enabled, realCap, loading, refresh }
}
