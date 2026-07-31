'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  downloadLeadCsvTemplate,
  importLeadsFromRows,
  parseLeadCsv,
  type LeadCsvRow,
  type LeadImportResult,
} from '@/lib/leads/csv-import'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Info,
} from 'lucide-react'

interface ImportLeadsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
  pipelineId?: string
}

export function ImportLeadsDialog({
  open,
  onOpenChange,
  onImported,
  pipelineId,
}: ImportLeadsDialogProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<LeadCsvRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<LeadImportResult | null>(null)

  function reset() {
    setFile(null)
    setParsedRows([])
    setParseError(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setResult(null)
    setParseError(null)

    const text = await selected.text()
    const { rows, error } = parseLeadCsv(text)
    if (error || rows.length === 0) {
      setParsedRows([])
      setParseError(error ?? 'No valid rows found.')
      toast.error(error ?? 'No valid rows found.')
      return
    }
    setParsedRows(rows)
  }

  async function handleImport() {
    if (parsedRows.length === 0) return
    setImporting(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Not authenticated')

      const importResult = await importLeadsFromRows(
        supabase,
        user.id,
        parsedRows,
        { pipelineId },
      )
      setResult(importResult)

      if (importResult.created > 0) {
        toast.success(
          `${importResult.created} lead${importResult.created === 1 ? '' : 's'} imported`,
        )
        onImported()
      }
      if (importResult.skipped > 0) {
        toast.message(
          `${importResult.skipped} skipped (open lead already exists for contact)`,
        )
      }
      if (importResult.failed > 0) {
        toast.error(
          `${importResult.failed} row${importResult.failed === 1 ? '' : 's'} failed`,
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const preview = parsedRows.slice(0, 5)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-wa-border bg-wa-panel text-wa-text sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-wa-text">Import leads (CSV)</DialogTitle>
          <DialogDescription className="text-wa-muted">
            Upload a CSV to create contacts + open leads in bulk. Download the
            template first so columns match the expected format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template */}
          <div className="rounded-xl border border-wa-border bg-wa-surface/40 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-2">
                <Info className="mt-0.5 size-4 shrink-0 text-wa-teal" />
                <div className="text-xs text-wa-muted">
                  <p className="font-medium text-wa-text">Required column</p>
                  <p>
                    <code className="text-wa-text/90">phone</code> (digits with
                    country code, e.g. 919876543210)
                  </p>
                  <p className="mt-1.5 font-medium text-wa-text">Optional</p>
                  <p>
                    name, email, company, title, value, priority (hot/warm/cold),
                    notes, follow_up_at (YYYY-MM-DD)
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadLeadCsvTemplate}
                className="shrink-0 border-wa-border"
              >
                <Download className="size-3.5" />
                Download template
              </Button>
            </div>
          </div>

          {/* Upload */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-wa-border p-6 transition-colors hover:border-wa-green/50"
          >
            {file ? (
              <>
                <FileText className="size-8 text-wa-green" />
                <p className="text-sm text-wa-text/90">{file.name}</p>
                <p className="text-xs text-wa-muted">
                  {parsedRows.length} valid row
                  {parsedRows.length !== 1 ? 's' : ''} detected
                </p>
              </>
            ) : (
              <>
                <Upload className="size-8 text-wa-muted/80" />
                <p className="text-sm text-wa-muted">Click to upload CSV file</p>
                <p className="text-xs text-wa-muted/80">.csv — phone column required</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />

          {parseError && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-500">
              {parseError}
            </p>
          )}

          {preview.length > 0 && !result && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-wa-muted">
                Preview (first {preview.length})
              </p>
              <div className="overflow-x-auto rounded-lg border border-wa-border">
                <table className="w-full min-w-[480px] text-xs">
                  <thead>
                    <tr className="bg-wa-surface">
                      <th className="px-2 py-1.5 text-left font-medium text-wa-muted">
                        Phone
                      </th>
                      <th className="px-2 py-1.5 text-left font-medium text-wa-muted">
                        Name
                      </th>
                      <th className="px-2 py-1.5 text-left font-medium text-wa-muted">
                        Title
                      </th>
                      <th className="px-2 py-1.5 text-left font-medium text-wa-muted">
                        Priority
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium text-wa-muted">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr key={row.line} className="border-t border-wa-border/60">
                        <td className="px-2 py-1.5 text-wa-text/90">{row.phone}</td>
                        <td className="px-2 py-1.5 text-wa-text/90">
                          {row.name || '—'}
                        </td>
                        <td className="max-w-[8rem] truncate px-2 py-1.5 text-wa-text/90">
                          {row.title || '—'}
                        </td>
                        <td className="px-2 py-1.5 capitalize text-wa-text/90">
                          {row.priority || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-wa-text/90">
                          {row.value ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-xs text-wa-muted">
                  …and {parsedRows.length - 5} more rows
                </p>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-2 rounded-xl border border-wa-border p-4">
              <p className="text-sm font-semibold text-wa-text">Import complete</p>
              <div className="flex flex-wrap gap-4 text-sm">
                {result.created > 0 && (
                  <span className="flex items-center gap-1.5 text-wa-green">
                    <CheckCircle className="size-4" />
                    {result.created} created
                  </span>
                )}
                {result.skipped > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <Info className="size-4" />
                    {result.skipped} skipped
                  </span>
                )}
                {result.failed > 0 && (
                  <span className="flex items-center gap-1.5 text-red-500">
                    <XCircle className="size-4" />
                    {result.failed} failed
                  </span>
                )}
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px] text-red-400">
                  {result.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-wa-border"
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              type="button"
              disabled={parsedRows.length === 0 || importing}
              onClick={() => void handleImport()}
              className="bg-wa-green text-white hover:bg-wa-teal"
            >
              {importing && <Loader2 className="size-4 animate-spin" />}
              Import {parsedRows.length > 0 ? `${parsedRows.length} leads` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
