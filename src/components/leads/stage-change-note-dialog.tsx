'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

export type PendingStageChange = {
  leadId: string
  leadLabel: string
  fromStageName: string
  toStageId: string
  toStageName: string
  currentNotes: string
}

interface StageChangeNoteDialogProps {
  pending: PendingStageChange | null
  open: boolean
  saving?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (notes: string | null, updateNotes: boolean) => void
}

export function StageChangeNoteDialog({
  pending,
  open,
  saving,
  onOpenChange,
  onConfirm,
}: StageChangeNoteDialogProps) {
  const [remark, setRemark] = useState('')

  useEffect(() => {
    if (!open || !pending) return
    setRemark(pending.currentNotes)
  }, [open, pending])

  const original = pending?.currentNotes ?? ''
  const trimmed = remark.trim()
  const notesChanged = trimmed !== original.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Update stage</DialogTitle>
          <DialogDescription className="text-sm">
            {pending ? (
              <>
                <span className="font-medium text-foreground">
                  {pending.leadLabel}
                </span>
                {': '}
                <span className="text-muted-foreground">
                  {pending.fromStageName}
                </span>
                {' → '}
                <span className="font-medium text-foreground">
                  {pending.toStageName}
                </span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="stage-change-remark">
            Remark / Summary{' '}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="stage-change-remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={4}
            placeholder="Add a note about this stage change…"
            className="resize-none text-sm"
            disabled={saving}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              onConfirm(trimmed || null, notesChanged)
            }
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : notesChanged ? (
              'Save stage & note'
            ) : (
              'Update stage'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
