"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDealCurrency } from "@/lib/currency";
import { LeadTemperatureBadge } from "@/components/pipelines/lead-temperature-badge";
import type { Contact, Deal, ContactNote, Tag } from "@/types";
import {
  Phone,
  Mail,
  Copy,
  Check,
  Tag as TagIcon,
  DollarSign,
  StickyNote,
  Plus,
  ExternalLink,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ContactSidebarProps {
  contact: Contact | null;
  /** `sheet` drops fixed sidebar width — used in mobile contact drawer. */
  variant?: "sidebar" | "sheet";
}

export function ContactSidebar({
  contact,
  variant = "sidebar",
}: ContactSidebarProps) {
  const [copied, setCopied] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<(Tag & { contact_tag_id: string })[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchContactData = useCallback(async () => {
    if (!contact) return;

    const supabase = createClient();

    const [dealsRes, notesRes, tagsRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, stage:pipeline_stages(*)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_tags")
        .select("id, tag_id, tags(*)")
        .eq("contact_id", contact.id),
    ]);

    if (dealsRes.data) setDeals(dealsRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (tagsRes.data) {
      const mapped = tagsRes.data
        .filter((ct: Record<string, unknown>) => ct.tags)
        .map((ct: Record<string, unknown>) => ({
          ...(ct.tags as Tag),
          contact_tag_id: ct.id as string,
        }));
      setTags(mapped);
    }
  }, [contact]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContactData();
  }, [fetchContactData]);

  const handleCopyPhone = useCallback(async () => {
    if (!contact?.phone) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [contact]);

  const handleAddNote = useCallback(async () => {
    if (!contact || !newNote.trim()) return;
    setAddingNote(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    const { data, error } = await supabase
      .from("contact_notes")
      .insert({
        contact_id: contact.id,
        user_id: user?.id,
        note_text: newNote.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  }, [contact, newNote]);

  if (!contact) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 items-center justify-center bg-wa-panel",
          variant === "sidebar" && "w-72 border-l border-wa-border",
        )}
      >
        <p className="text-sm text-wa-muted/80">Select a conversation</p>
      </div>
    );
  }

  const displayName = contact.name || contact.phone;
  const initials = displayName.charAt(0).toUpperCase();
  const openDeals = deals.filter((d) => !d.status || d.status === "open");
  const closedDeals = deals.filter(
    (d) => d.status === "won" || d.status === "lost",
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-wa-panel",
        variant === "sidebar" && "w-72 border-l border-wa-border",
      )}
    >
      {/* Sticky header */}
      <div className="shrink-0 border-b border-wa-border px-4 pb-4 pt-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-wa-elevated text-lg font-semibold text-wa-text">
            {contact.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contact.avatar_url}
                alt={displayName}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <h3 className="mt-2.5 text-sm font-semibold text-wa-text">
            {displayName}
          </h3>
          {contact.company ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-wa-muted">
              <Building2 className="size-3" />
              {contact.company}
            </p>
          ) : null}
        </div>

        <div className="mt-3 space-y-1">
          <button
            type="button"
            onClick={handleCopyPhone}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-wa-text/90 transition-colors hover:bg-wa-surface"
          >
            <Phone className="h-3.5 w-3.5 shrink-0 text-wa-muted/80" />
            <span className="min-w-0 flex-1 truncate text-left text-xs">
              {contact.phone}
            </span>
            {copied ? (
              <Check className="h-3 w-3 text-wa-green" />
            ) : (
              <Copy className="h-3 w-3 text-wa-muted" />
            )}
          </button>

          {contact.email ? (
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-wa-text/90">
              <Mail className="h-3.5 w-3.5 shrink-0 text-wa-muted/80" />
              <span className="truncate">{contact.email}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Scrollable body — native overflow so content is never clipped */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {/* Tags */}
        <section>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-wa-muted/80">
            <TagIcon className="h-3 w-3" />
            Tags
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.length === 0 ? (
              <p className="text-xs text-wa-muted">No tags</p>
            ) : (
              tags.map((tag) => (
                <span
                  key={tag.contact_tag_id}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))
            )}
          </div>
        </section>

        <div className="my-3 border-t border-wa-border" />

        {/* Deals / Leads */}
        <section>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-wa-muted/80">
              <DollarSign className="h-3 w-3" />
              Deals & Leads
            </div>
            <Link
              href="/leads"
              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-wa-green hover:underline"
            >
              View all
              <ExternalLink className="size-2.5" />
            </Link>
          </div>
          <div className="mt-2 space-y-2">
            {deals.length === 0 ? (
              <p className="text-xs text-wa-muted">No deals yet</p>
            ) : (
              <>
                {openDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
                {closedDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </>
            )}
          </div>
        </section>

        <div className="my-3 border-t border-wa-border" />

        {/* Notes */}
        <section className="pb-6">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-wa-muted/80">
            <StickyNote className="h-3 w-3" />
            Notes
          </div>
          <div className="mt-2">
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="min-h-[56px] flex-1 resize-none rounded-lg border border-wa-border bg-wa-surface px-3 py-2 text-xs text-wa-text placeholder:text-wa-muted/80 outline-none focus:border-wa-green/50"
              />
              <Button
                size="sm"
                className="h-auto self-stretch bg-wa-bubble-out px-2 hover:bg-wa-green"
                onClick={handleAddNote}
                disabled={!newNote.trim() || addingNote}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="mt-2 space-y-2">
              {notes.length === 0 ? (
                <p className="text-xs text-wa-muted">No notes yet</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg bg-wa-surface px-3 py-2"
                  >
                    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-wa-text/90">
                      {note.note_text}
                    </p>
                    <p className="mt-1.5 text-[10px] text-wa-muted">
                      {format(new Date(note.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const status = deal.status ?? "open";
  return (
    <div className="rounded-lg border border-wa-border/60 bg-wa-surface px-3 py-2">
      <p className="text-sm font-medium leading-snug text-wa-text">
        {deal.title}
      </p>
      <LeadTemperatureBadge
        temperature={deal.lead_temperature}
        score={deal.lead_score}
        className="mt-1.5"
      />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-xs text-wa-muted">
        <span className="font-medium text-wa-text/80">
          {formatDealCurrency(Number(deal.value || 0), deal.currency)}
        </span>
        <div className="flex items-center gap-1">
          {deal.stage ? (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${deal.stage.color}20`,
                color: deal.stage.color,
              }}
            >
              {deal.stage.name}
            </span>
          ) : null}
          {status !== "open" ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                status === "won"
                  ? "bg-wa-green/15 text-wa-green"
                  : "bg-red-500/15 text-red-400",
              )}
            >
              {status === "won" ? "Won" : "Lost"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
