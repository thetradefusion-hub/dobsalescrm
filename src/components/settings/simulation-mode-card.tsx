'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FlaskConical, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Settings: full simulation + optional real Meta cap per broadcast.
 */
export function SimulationModeCard() {
  const [enabled, setEnabled] = useState(false)
  const [realCap, setRealCap] = useState<number | null>(null)
  const [realCapInput, setRealCapInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp/simulation')
      if (!res.ok) throw new Error('Failed to load')
      const data = (await res.json()) as {
        enabled?: boolean
        realCap?: number | null
      }
      setEnabled(Boolean(data.enabled))
      const cap =
        typeof data.realCap === 'number' && Number.isFinite(data.realCap)
          ? data.realCap
          : null
      setRealCap(cap)
      setRealCapInput(cap === null ? '' : String(cap))
    } catch {
      toast.error('Could not load simulation setting')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(next: {
    enabled?: boolean
    realCap?: number | null
  }) {
    setSaving(true)
    try {
      const res = await fetch('/api/whatsapp/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = (await res.json()) as {
        enabled?: boolean
        realCap?: number | null
      }
      setEnabled(Boolean(data.enabled))
      const cap =
        typeof data.realCap === 'number' && Number.isFinite(data.realCap)
          ? data.realCap
          : null
      setRealCap(cap)
      setRealCapInput(cap === null ? '' : String(cap))
      return true
    } catch {
      toast.error('Could not update simulation settings')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function onToggle(next: boolean) {
    const prev = enabled
    setEnabled(next)
    const ok = await save({ enabled: next })
    if (!ok) {
      setEnabled(prev)
      return
    }
    toast.success(
      next
        ? 'Full simulation on — no real WhatsApp sends'
        : 'Full simulation off — real API used (see limit below)',
    )
  }

  async function onSaveRealCap() {
    const trimmed = realCapInput.trim()
    let nextCap: number | null
    if (trimmed === '') {
      nextCap = null
    } else {
      const n = Number.parseInt(trimmed, 10)
      if (!Number.isFinite(n) || n < 0) {
        toast.error('Enter a non-negative number, or leave blank for unlimited')
        return
      }
      nextCap = n
    }
    const ok = await save({ realCap: nextCap })
    if (!ok) return
    toast.success(
      nextCap === null
        ? 'Real API limit cleared — unlimited when simulation is off'
        : `Real API limit set to ${nextCap} per broadcast (rest simulated)`,
    )
  }

  return (
    <Card className="border-wa-border bg-wa-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-wa-text">
          <FlaskConical className="size-5 text-wa-green" />
          Simulation mode
        </CardTitle>
        <CardDescription className="text-wa-muted">
          Full simulation skips Meta entirely. Or keep it off and cap how many
          real WhatsApp messages go out per broadcast — the rest are simulated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-wa-border bg-wa-surface/40 px-4 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="wa-simulation" className="text-wa-text">
              Simulate all sends
            </Label>
            <p className="text-xs text-wa-muted">
              {enabled
                ? 'Active — every broadcast recipient is faked'
                : 'Off — real API used up to the limit below'}
            </p>
          </div>
          {loading ? (
            <Loader2 className="size-4 animate-spin text-wa-muted" />
          ) : (
            <Switch
              id="wa-simulation"
              checked={enabled}
              disabled={saving}
              onCheckedChange={onToggle}
            />
          )}
        </div>

        <div
          className={`space-y-3 rounded-lg border border-wa-border bg-wa-surface/40 px-4 py-3 ${
            enabled ? 'opacity-50' : ''
          }`}
        >
          <div className="space-y-0.5">
            <Label htmlFor="wa-real-cap" className="text-wa-text">
              Real API limit per broadcast
            </Label>
            <p className="text-xs text-wa-muted">
              First N contacts get a real Meta send; remaining contacts are
              simulated. Leave blank for unlimited (all real).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="wa-real-cap"
              type="number"
              min={0}
              step={1}
              placeholder="Unlimited"
              value={realCapInput}
              disabled={loading || saving || enabled}
              onChange={(e) => setRealCapInput(e.target.value)}
              className="max-w-[140px] border-wa-border bg-wa-panel text-wa-text"
            />
            <Button
              type="button"
              variant="outline"
              disabled={loading || saving || enabled}
              onClick={() => void onSaveRealCap()}
              className="border-wa-border text-wa-text/90"
            >
              Save limit
            </Button>
            {realCap !== null && !enabled ? (
              <span className="text-xs text-wa-muted">
                Current: {realCap} real / rest sim
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
