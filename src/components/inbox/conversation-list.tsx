"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationStatus } from "@/types";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/auth/permissions";

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  conversations: Conversation[];
  onConversationsLoaded: (conversations: Conversation[]) => void;
}

const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: "bg-wa-green",
  pending: "bg-amber-500",
  closed: "bg-wa-muted",
};

const FILTER_OPTIONS: { label: string; value: ConversationStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Closed", value: "closed" },
];

export function ConversationList({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, permissions } = useAuth();
  const viewAllChats =
    isAdmin ||
    hasPermission(permissions, "*") ||
    hasPermission(permissions, "whatsapp.inbox_all");

  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      let query = supabase
        .from("conversations")
        .select("*, contact:contacts(*)")
        .order("last_message_at", { ascending: false });

      // Defense in depth — RLS also scopes SE; keep UI filter aligned.
      if (!viewAllChats && user?.id) {
        query = query.eq("assigned_agent_id", user.id);
      }

      const { data, error } = await query;

      if (cancelled) return;

      if (error) {
        console.error("Failed to fetch conversations:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setLoading(false);
        return;
      }

      onConversationsLoadedRef.current(data ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [viewAllChats, user?.id]);

  const filtered = useMemo(() => {
    let result = conversations;

    if (filter !== "all") {
      result = result.filter((c) => c.status === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        const lastMsg = c.last_message_text?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
      });
    }

    return result;
  }, [conversations, filter, search]);

  const unreadTotal = useMemo(
    () => conversations.reduce((n, c) => n + (c.unread_count > 0 ? 1 : 0), 0),
    [conversations],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [],
  );

  const handleSelect = useCallback(
    (conv: Conversation) => {
      onSelect(conv);
    },
    [onSelect],
  );

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-wa-panel lg:w-80 lg:shrink-0 lg:border-r lg:border-wa-border">
      {/* Mobile app header */}
      <div className="shrink-0 border-b border-wa-border/80 wa-mobile-shell lg:bg-wa-panel">
        <div className="h-0.5 bg-gradient-to-r from-wa-green via-wa-teal to-wa-read lg:hidden" aria-hidden />
        <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] lg:px-3 lg:pt-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-wa-text lg:text-base lg:font-semibold">
              Chats
            </h1>
            {unreadTotal > 0 ? (
              <p className="text-xs font-medium text-wa-green lg:hidden">
                {unreadTotal} unread
              </p>
            ) : (
              <p className="text-xs text-wa-muted lg:hidden">
                WhatsApp conversations
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 px-4 pb-3 lg:px-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wa-muted" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search chats..."
              className="h-11 rounded-2xl border-wa-border/80 bg-wa-surface/90 pl-9 text-sm text-wa-text shadow-sm placeholder:text-wa-muted focus:border-wa-green/50 lg:h-10 lg:rounded-xl"
            />
          </div>

          {/* Filter pills — mobile app style */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === opt.value
                    ? "bg-wa-green text-white"
                    : "bg-wa-surface text-wa-muted active:bg-wa-elevated",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-wa-green border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm font-medium text-wa-text">No chats found</p>
            <p className="mt-1 text-xs text-wa-muted">
              {search.trim() ? "Try a different search" : "New messages will appear here"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: ConversationItemProps) {
  const contact = conversation.contact;
  const displayName = contact?.name || contact?.phone || "Unknown";
  const initials = displayName.charAt(0).toUpperCase();

  const handleClick = useCallback(() => {
    onSelect(conversation);
  }, [onSelect, conversation]);

  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: false,
      })
    : "";

  const hasUnread = conversation.unread_count > 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-wa-surface lg:px-3 lg:py-3",
        isActive && "bg-wa-surface/80 lg:border-l-2 lg:border-wa-green",
        !isActive && "hover:bg-wa-surface/50",
      )}
    >
      <div className="relative shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-wa-elevated text-base font-semibold text-wa-text lg:h-10 lg:w-10 lg:text-sm">
          {contact?.avatar_url ? (
            <img
              src={contact.avatar_url}
              alt={displayName}
              className="h-12 w-12 rounded-full object-cover lg:h-10 lg:w-10"
            />
          ) : (
            initials
          )}
        </div>
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-wa-panel",
            STATUS_COLORS[conversation.status],
          )}
          title={conversation.status}
        />
      </div>

      <div className="min-w-0 flex-1 border-b border-wa-border/60 pb-3.5 lg:pb-0 lg:border-0">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[15px] lg:text-sm",
              hasUnread ? "font-bold text-wa-text" : "font-medium text-wa-text",
            )}
          >
            {displayName}
          </span>
          <span
            className={cn(
              "shrink-0 text-[11px] tabular-nums",
              hasUnread ? "font-semibold text-wa-green" : "text-wa-muted",
            )}
          >
            {timeAgo}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm lg:text-xs",
              hasUnread ? "font-medium text-wa-text" : "text-wa-muted",
            )}
          >
            {conversation.last_message_text || "No messages yet"}
          </p>
          {hasUnread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-wa-green px-1.5 text-[11px] font-bold text-white">
              {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
