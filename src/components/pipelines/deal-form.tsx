"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type {
  Contact,
  Conversation,
  Deal,
  DealStatus,
  PipelineStage,
  Profile,
} from "@/types";
import type { LeadTemperature } from "@/lib/ai/lead-qualification";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  X,
  Trash2,
  IndianRupee,
  Loader2,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import {
  DEFAULT_DEAL_CURRENCY,
  DEAL_CURRENCY_OPTIONS,
} from "@/lib/currency";
import { toast } from "sonner";
import { LEAD_SOURCES } from "@/lib/leads/sources";

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  pipelineId: string;
  stages: PipelineStage[];
  defaultStageId?: string;
  onSaved: () => void;
}

export function DealForm({
  open,
  onOpenChange,
  deal,
  pipelineId,
  stages,
  defaultStageId,
  onSaved,
}: DealFormProps) {
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_DEAL_CURRENCY);
  const [contactId, setContactId] = useState("");
  const [stageId, setStageId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("manual");
  const [leadTemperature, setLeadTemperature] = useState<LeadTemperature | "">("");
  const [leadScore, setLeadScore] = useState("");
  const [leadBudgetInr, setLeadBudgetInr] = useState("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [linkedConversation, setLinkedConversation] =
    useState<Conversation | null>(null);

  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<DealStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset the form fields every time the sheet opens or its input
  // props change. This is a legitimate prop-driven sync; the rule is
  // over-cautious here, hence the block-level disable.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (deal) {
      setTitle(deal.title);
      setValue(String(deal.value ?? ""));
      setCurrency(deal.currency || DEFAULT_DEAL_CURRENCY);
      // contact_id is nullable when the contact has been deleted
      // (migration 004: ON DELETE SET NULL). "" means "no selection".
      setContactId(deal.contact_id ?? "");
      setStageId(deal.stage_id);
      setAssignedTo(deal.assigned_to ?? "");
      setExpectedCloseDate(deal.expected_close_date ?? "");
      setFollowUpAt(
        deal.follow_up_at ? new Date(deal.follow_up_at).toISOString().slice(0, 16) : "",
      );
      setNotes(deal.notes ?? "");
      setSource(deal.source ?? "manual");
      setLeadTemperature(deal.lead_temperature ?? "");
      setLeadScore(deal.lead_score != null ? String(deal.lead_score) : "");
      setLeadBudgetInr(
        deal.lead_budget_inr != null ? String(deal.lead_budget_inr) : "",
      );
    } else {
      setTitle("");
      setValue("");
      setCurrency(DEFAULT_DEAL_CURRENCY);
      setContactId("");
      setStageId(defaultStageId || stages[0]?.id || "");
      setAssignedTo("");
      setExpectedCloseDate("");
      setFollowUpAt("");
      setNotes("");
      setSource("manual");
      setLeadTemperature("");
      setLeadScore("");
      setLeadBudgetInr("");
    }
  }, [open, deal, defaultStageId, stages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load supporting data once the sheet is open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("contacts").select("*").order("name"),
        supabase.from("profiles").select("*").order("full_name"),
      ]);
      if (cancelled) return;
      setContacts((c.data ?? []) as Contact[]);
      setProfiles((p.data ?? []) as Profile[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  // Fetch linked conversation for the selected contact (newest open one).
  // Clearing on no-selection is sync with prop state; the populated
  // case runs setLinkedConversation inside the async fetch callback.
  useEffect(() => {
    if (!open || !contactId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinkedConversation(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contactId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setLinkedConversation((data as Conversation | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, contactId, supabase]);

  async function handleSave() {
    if (!title.trim() || !contactId || !stageId) {
      toast.error("Title, contact, and stage are required");
      return;
    }
    setSaving(true);

    const parsedScore = leadScore.trim()
      ? Number.parseInt(leadScore, 10)
      : null;
    const parsedBudget = leadBudgetInr.trim()
      ? Number.parseInt(leadBudgetInr, 10)
      : null;

    const payload = {
      title: title.trim(),
      value: parseFloat(value) || 0,
      currency,
      contact_id: contactId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      assigned_to: assignedTo || null,
      notes: notes.trim() || null,
      source: source || "manual",
      expected_close_date: expectedCloseDate || null,
      follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : null,
      lead_temperature: leadTemperature || null,
      lead_score:
        parsedScore != null && Number.isFinite(parsedScore)
          ? Math.min(100, Math.max(0, parsedScore))
          : null,
      lead_budget_inr:
        parsedBudget != null && Number.isFinite(parsedBudget)
          ? parsedBudget
          : null,
      qualified_at: leadTemperature
        ? deal?.qualified_at ?? new Date().toISOString()
        : null,
    };

    if (deal) {
      const { error } = await supabase
        .from("deals")
        .update(payload)
        .eq("id", deal.id);
      if (error) {
        toast.error("Failed to save deal");
        setSaving(false);
        return;
      }
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        toast.error("Not signed in");
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("deals")
        .insert({ ...payload, user_id: user.id, status: "open" });
      if (error) {
        toast.error("Failed to create deal");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast.success(deal ? "Deal updated" : "Deal created");
    onOpenChange(false);
    onSaved();
  }

  async function handleStatusChange(status: DealStatus) {
    if (!deal) return;
    setStatusAction(status);
    const { error } = await supabase
      .from("deals")
      .update({ status })
      .eq("id", deal.id);
    setStatusAction(null);
    if (error) {
      toast.error("Failed to update deal status");
      return;
    }
    toast.success(
      status === "won" ? "Marked as won" : status === "lost" ? "Marked as lost" : "Deal reopened",
    );
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!deal) return;
    setDeleting(true);
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    setDeleting(false);
    if (error) {
      toast.error("Failed to delete deal");
      return;
    }
    toast.success("Deal deleted");
    setConfirmDelete(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-wa-panel border-wa-border text-wa-text sm:max-w-lg w-full p-0"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-wa-border/50 p-4">
            <SheetTitle className="text-wa-text">
              {deal ? "Edit Deal" : "New Deal"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid gap-2">
              <Label className="text-wa-text/90">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Deal title"
                className="border-wa-border bg-wa-surface text-wa-text"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-wa-text/90">Contact</Label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="h-9 w-full rounded-lg border border-wa-border bg-wa-surface px-2.5 text-sm text-wa-text outline-none focus:border-wa-green focus:ring-1 focus:ring-wa-green"
              >
                <option value="">Select a contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.phone}
                  </option>
                ))}
              </select>

              {linkedConversation && (
                <Link
                  href="/inbox"
                  className="mt-1 inline-flex items-center gap-1.5 self-start rounded-md bg-wa-green/10 px-2 py-1 text-xs text-wa-green hover:bg-wa-green/20"
                >
                  <WhatsAppIcon className="h-3 w-3" />
                  Link to Conversation
                </Link>
              )}
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div className="grid gap-2">
                <Label className="text-wa-text/90">Value</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-wa-muted/80" />
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0"
                    className="border-wa-border bg-wa-surface pl-7 text-wa-text"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-wa-text/90">Currency</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 w-full rounded-lg border border-wa-border bg-wa-surface px-2.5 text-sm text-wa-text outline-none focus:border-wa-green"
                >
                  {DEAL_CURRENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-wa-text/90">Expected Close Date</Label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="border-wa-border bg-wa-surface text-wa-text"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-wa-text/90">Follow-up</Label>
              <Input
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className="border-wa-border bg-wa-surface text-wa-text"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-wa-text/90">Stage</Label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="h-9 w-full rounded-lg border border-wa-border bg-wa-surface px-2.5 text-sm text-wa-text outline-none focus:border-wa-green"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-wa-text/90">Assigned To</Label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-9 w-full rounded-lg border border-wa-border bg-wa-surface px-2.5 text-sm text-wa-text outline-none focus:border-wa-green"
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-wa-text/90">Lead source</Label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-9 w-full rounded-lg border border-wa-border bg-wa-surface px-2.5 text-sm text-wa-text outline-none focus:border-wa-green"
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-wa-text/90">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                className="min-h-[100px] border-wa-border bg-wa-surface text-wa-text"
              />
            </div>

            <div className="space-y-3 rounded-lg border border-wa-border bg-wa-panel/50 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-wa-muted">
                Lead qualification
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label className="text-wa-text/90">Temperature</Label>
                  <select
                    value={leadTemperature}
                    onChange={(e) =>
                      setLeadTemperature(e.target.value as LeadTemperature | "")
                    }
                    className="h-9 w-full rounded-lg border border-wa-border bg-wa-surface px-2.5 text-sm text-wa-text outline-none focus:border-wa-green"
                  >
                    <option value="">None</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-wa-text/90">Score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={leadScore}
                    onChange={(e) => setLeadScore(e.target.value)}
                    placeholder="0–100"
                    className="border-wa-border bg-wa-surface text-wa-text"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-wa-text/90">Budget (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={leadBudgetInr}
                    onChange={(e) => setLeadBudgetInr(e.target.value)}
                    placeholder="INR"
                    className="border-wa-border bg-wa-surface text-wa-text"
                  />
                </div>
              </div>
            </div>

            {deal && (
              <div className="space-y-2 rounded-lg border border-wa-border bg-wa-panel/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-wa-muted">
                  Status
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => handleStatusChange("won")}
                    disabled={!!statusAction || deal.status === "won"}
                    className="flex-1 bg-wa-bubble-out text-wa-text hover:bg-wa-teal hover:text-white disabled:opacity-50"
                  >
                    {statusAction === "won" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        Mark as Won
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleStatusChange("lost")}
                    disabled={!!statusAction || deal.status === "lost"}
                    className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {statusAction === "lost" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="mr-1 h-4 w-4" />
                        Mark as Lost
                      </>
                    )}
                  </Button>
                </div>
                {deal.status && deal.status !== "open" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleStatusChange("open")}
                    disabled={!!statusAction}
                    className="w-full text-wa-muted hover:text-wa-text"
                  >
                    Reopen deal
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-wa-border/50 bg-wa-panel/80 p-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-wa-border bg-transparent text-wa-text/90 hover:bg-wa-surface"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !title.trim() || !contactId || !stageId}
                className="flex-1 bg-wa-bubble-out text-wa-text hover:bg-wa-teal hover:text-white"
              >
                {saving ? "Saving..." : deal ? "Save Changes" : "Create Deal"}
              </Button>
            </div>

            {deal &&
              (confirmDelete ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs">
                  <span className="text-red-300">Delete this deal?</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="rounded px-2 py-1 text-wa-text/90 hover:bg-wa-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded bg-red-600 px-2 py-1 font-medium text-wa-text hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Confirm"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete Deal
                </button>
              ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
