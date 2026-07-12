"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type {
  Conversation,
  Message,
  Contact,
  ConversationStatus,
  MessageTemplate,
  Profile,
} from "@/types";
import {
  MessageSquare,
  ChevronDown,
  UserPlus,
  Check,
  Clock,
  ArrowLeft,
  User,
} from "lucide-react";
import { format, isToday, isYesterday, differenceInHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { TemplatePicker } from "./template-picker";
import { ContactSidebar } from "./contact-sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

function renderTemplateBody(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, raw) => {
    const idx = Number(raw) - 1;
    return params[idx] ?? `{{${raw}}}`;
  });
}

interface MessageThreadProps {
  conversation: Conversation | null;
  contact: Contact | null;
  messages: Message[];
  onMessagesLoaded: (messages: Message[]) => void;
  onNewMessage: (message: Message) => void;
  onUpdateMessage: (id: string, updates: Partial<Message>) => void;
  onStatusChange: (conversationId: string, status: ConversationStatus) => void;
  onAssignChange: (
    conversationId: string,
    assignedAgentId: string | null,
  ) => void;
  /**
   * On mobile, the thread is shown full-screen with the conversation list
   * hidden. This callback lets the page deselect the active conversation
   * and reveal the list again. Rendered as a back-arrow in the header on
   * mobile only.
   */
  onBack?: () => void;
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const day = format(new Date(msg.created_at), "yyyy-MM-dd");
    if (day !== currentDate) {
      currentDate = day;
      groups.push({ date: msg.created_at, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }

  return groups;
}

const STATUS_OPTIONS: { label: string; value: ConversationStatus; color: string }[] = [
  { label: "Open", value: "open", color: "text-wa-green" },
  { label: "Pending", value: "pending", color: "text-amber-400" },
  { label: "Closed", value: "closed", color: "text-wa-muted" },
];

export function MessageThread({
  conversation,
  contact,
  messages,
  onMessagesLoaded,
  onNewMessage,
  onUpdateMessage,
  onStatusChange,
  onAssignChange,
  onBack,
}: MessageThreadProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Profiles are bounded by RLS to rows the current user is allowed to
  // see — today that's just the current user, but the dropdown keeps the
  // shape ready for shared-team workspaces without a refactor.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .order("full_name")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch profiles:", error);
          return;
        }
        setProfiles((data as Profile[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 24-hour session timer
  const sessionInfo = useMemo(() => {
    if (!messages.length) return { expired: false, remaining: "" };

    // Find last customer message
    const lastCustomerMsg = [...messages]
      .reverse()
      .find((m) => m.sender_type === "customer");

    if (!lastCustomerMsg) return { expired: true, remaining: "No customer messages" };

    const hoursSince = differenceInHours(new Date(), new Date(lastCustomerMsg.created_at));
    const expired = hoursSince >= 24;

    if (expired) {
      return { expired: true, remaining: "Expired" };
    }

    const hoursLeft = 24 - hoursSince;
    const remaining =
      hoursLeft >= 1
        ? `${Math.floor(hoursLeft)}h remaining`
        : `${Math.floor(hoursLeft * 60)}m remaining`;

    return { expired, remaining };
  }, [messages]);

  // Store latest callback in a ref so fetchMessages doesn't need to
  // depend on `onMessagesLoaded` — otherwise parent re-renders cause
  // fetchMessages to change → useEffect re-fires → refetch → realtime
  // UPDATE on conversations.unread_count → parent re-renders → LOOP.
  // The ref is written inside an effect so the mutation doesn't happen
  // during render (React 19 refs rule); consumers only read `.current`
  // inside the async fetch completion, which runs after the render.
  const onMessagesLoadedRef = useRef(onMessagesLoaded);
  useEffect(() => {
    onMessagesLoadedRef.current = onMessagesLoaded;
  });

  const conversationId = conversation?.id;
  const hasUnread = (conversation?.unread_count ?? 0) > 0;

  // Fetch messages whenever the selected conversation changes. Kept
  // separate from the unread-reset effect so that incoming messages
  // arriving while the thread is open don't trigger a full refetch —
  // they only flip hasUnread, which only the reset effect listens to.
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    let cancelled = false;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Failed to fetch messages:", error);
      } else {
        onMessagesLoadedRef.current(data ?? []);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Reset the server-side unread_count to 0 whenever an unread count
  // surfaces on the active conversation — covers both (a) opening a
  // conversation that had unread messages and (b) new messages arriving
  // while the user is already viewing the thread (webhook server-bumps
  // unread_count to N+1; the realtime UPDATE propagates it into the
  // client, which re-runs this effect and flips it back to 0).
  //
  // Guarding on hasUnread prevents the eq-update loop: once unread_count
  // is 0 the condition is false, so no further UPDATE is issued.
  useEffect(() => {
    if (!conversationId || !hasUnread) return;
    const supabase = createClient();
    supabase
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId)
      .then(({ error }) => {
        if (error) console.error("Failed to reset unread_count:", error);
      });
  }, [conversationId, hasUnread]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!conversation) return;

      const tempId = `temp-${Date.now()}`;

      // Optimistic update — shows the message immediately with "sending" status
      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: conversation.id,
        sender_type: "agent",
        content_type: "text",
        content_text: text,
        status: "sending",
        created_at: new Date().toISOString(),
      };
      onNewMessage(optimisticMsg);

      try {
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversation.id,
            message_type: "text",
            content_text: text,
          }),
        });

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const reason = payload?.error || `HTTP ${res.status}`;
          console.error("Failed to send message:", reason);
          toast.error(`Failed to send: ${reason}`);
          // Mark the optimistic bubble as failed so the user sees what happened
          onUpdateMessage(tempId, { status: "failed" });
          return;
        }

        // Success — the realtime INSERT event will replace the temp bubble
        // with the real DB row. If realtime hasn't arrived yet, at least
        // flip status to 'sent' so the UI stops showing "sending".
        onUpdateMessage(tempId, { status: "sent" });
      } catch (err) {
        console.error("Failed to send message:", err);
        const reason = err instanceof Error ? err.message : "network error";
        toast.error(`Failed to send: ${reason}`);
        onUpdateMessage(tempId, { status: "failed" });
      }
    },
    [conversation, onNewMessage, onUpdateMessage]
  );

  const handleStatusChange = useCallback(
    async (status: ConversationStatus) => {
      if (!conversation) return;

      const supabase = createClient();
      await supabase
        .from("conversations")
        .update({ status })
        .eq("id", conversation.id);

      onStatusChange(conversation.id, status);
    },
    [conversation, onStatusChange]
  );

  const handleOpenTemplates = useCallback(() => {
    setTemplateModalOpen(true);
  }, []);

  const handleSendTemplate = useCallback(
    async (
      template: MessageTemplate,
      params: string[],
      options?: { headerMediaUrl?: string },
    ) => {
      if (!conversation) return;

      const renderedBody = renderTemplateBody(template.body_text, params);
      const tempId = `temp-${Date.now()}`;

      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: conversation.id,
        sender_type: "agent",
        content_type: "template",
        content_text: renderedBody,
        media_url: options?.headerMediaUrl || undefined,
        template_name: template.name,
        status: "sending",
        created_at: new Date().toISOString(),
      };
      onNewMessage(optimisticMsg);

      try {
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversation.id,
            message_type: "template",
            template_name: template.name,
            template_language: template.language ?? "en_US",
            template_params: params,
            content_text: renderedBody,
            media_url: options?.headerMediaUrl || null,
            header_media:
              options?.headerMediaUrl &&
              (template.header_type === "image" ||
                template.header_type === "video" ||
                template.header_type === "document")
                ? {
                    type: template.header_type,
                    link: options.headerMediaUrl,
                  }
                : undefined,
          }),
        });

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const reason = payload?.error || `HTTP ${res.status}`;
          console.error("Failed to send template:", reason);
          toast.error(`Failed to send template: ${reason}`);
          onUpdateMessage(tempId, { status: "failed" });
          return;
        }

        onUpdateMessage(tempId, { status: "sent" });
      } catch (err) {
        console.error("Failed to send template:", err);
        const reason = err instanceof Error ? err.message : "network error";
        toast.error(`Failed to send template: ${reason}`);
        onUpdateMessage(tempId, { status: "failed" });
      }
    },
    [conversation, onNewMessage, onUpdateMessage],
  );

  const handleAssignChange = useCallback(
    async (agentId: string | null) => {
      if (!conversation) return;

      const supabase = createClient();
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_agent_id: agentId })
        .eq("id", conversation.id);

      if (error) {
        console.error("Failed to update assignment:", error);
        toast.error("Failed to update assignment");
        return;
      }

      onAssignChange(conversation.id, agentId);
    },
    [conversation, onAssignChange],
  );

  // Empty state
  if (!conversation || !contact) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-wa-deep wa-inbox-wallpaper">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wa-panel shadow-sm">
          <MessageSquare className="h-8 w-8 text-wa-muted" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-wa-text">
          Select a conversation
        </h3>
        <p className="mt-1 px-6 text-center text-xs text-wa-muted">
          Choose a chat from the list to start messaging
        </p>
      </div>
    );
  }

  const displayName = contact.name || contact.phone;
  const messageGroups = groupMessagesByDate(messages);
  const currentStatus = STATUS_OPTIONS.find(
    (s) => s.value === conversation.status
  );
  const assignedAgentId = conversation.assigned_agent_id ?? null;
  const currentAssignee = profiles.find((p) => p.user_id === assignedAgentId);
  const assignLabel = assignedAgentId
    ? (currentAssignee?.full_name ?? "Assigned")
    : "Assign";

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-wa-deep">
      {/* Chat header — WhatsApp-style sticky bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-wa-border bg-wa-header/95 px-2 py-2 backdrop-blur-md sm:px-3 lg:bg-wa-panel lg:px-4 lg:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to conversations"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-wa-text active:bg-wa-surface lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setContactSheetOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left active:bg-wa-surface/80 lg:pointer-events-none lg:active:bg-transparent"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wa-elevated text-sm font-semibold text-wa-text">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-wa-text lg:text-sm">
                {displayName}
              </h2>
              <p className="truncate text-xs text-wa-muted">
                {contact.phone}
                <span className="hidden sm:inline">
                  {" · "}
                  {sessionInfo.expired ? "Session expired" : sessionInfo.remaining}
                </span>
              </p>
            </div>
          </button>
          <Badge
            variant="outline"
            className={cn(
              "hidden shrink-0 gap-1 border-wa-border text-[10px] lg:inline-flex",
              sessionInfo.expired ? "text-red-500 dark:text-red-400" : "text-wa-green",
            )}
          >
            <Clock className="h-3 w-3" />
            {sessionInfo.remaining}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => setContactSheetOpen(true)}
            aria-label="Contact info"
            className="flex h-10 w-10 items-center justify-center rounded-full text-wa-muted active:bg-wa-surface lg:hidden"
          >
            <User className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-0.5 lg:flex">
          {/* Status dropdown — desktop only; mobile uses contact sheet */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(
                  "inline-flex items-center justify-center h-7 gap-1 px-2 text-xs rounded-md hover:bg-wa-surface",
                  currentStatus?.color ?? "text-wa-muted"
                )}>
                {currentStatus?.label ?? "Status"}
                <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-wa-border bg-wa-surface"
            >
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={cn("text-sm", opt.color)}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex items-center justify-center h-7 gap-1 px-2 text-xs rounded-md hover:bg-wa-surface",
                assignedAgentId ? "text-wa-green" : "text-wa-muted"
              )}
            >
              <UserPlus className="h-3 w-3" />
              <span className="hidden sm:inline">{assignLabel}</span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-wa-border bg-wa-surface"
            >
              {profiles.length === 0 ? (
                <DropdownMenuItem disabled className="text-sm text-wa-muted/80">
                  No teammates available
                </DropdownMenuItem>
              ) : (
                profiles.map((p) => {
                  const isSelected = p.user_id === assignedAgentId;
                  return (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => handleAssignChange(p.user_id)}
                      className={cn(
                        "text-sm",
                        isSelected ? "text-wa-green" : "text-wa-text/90"
                      )}
                    >
                      <span className="flex-1">
                        {p.full_name}
                        {p.user_id === user?.id ? " (me)" : ""}
                      </span>
                      {isSelected && <Check className="ml-2 h-3 w-3" />}
                    </DropdownMenuItem>
                  );
                })
              )}
              {assignedAgentId && (
                <>
                  <DropdownMenuSeparator className="bg-wa-elevated" />
                  <DropdownMenuItem
                    onClick={() => handleAssignChange(null)}
                    className="text-sm text-wa-muted"
                  >
                    Unassign
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="wa-inbox-wallpaper min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 sm:px-4 sm:py-4"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-wa-green border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-wa-muted/80">No messages yet</p>
            <p className="text-xs text-wa-muted">
              Send a template to start the conversation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messageGroups.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="mb-4 flex items-center justify-center">
                  <span className="rounded-full bg-wa-surface px-3 py-1 text-[10px] font-medium text-wa-muted">
                    {formatDateSeparator(group.date)}
                  </span>
                </div>
                {/* Messages */}
                <div className="space-y-2">
                  {group.messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <MessageComposer
        conversationId={conversation.id}
        sessionExpired={sessionInfo.expired}
        onSend={handleSend}
        onOpenTemplates={handleOpenTemplates}
      />

      <TemplatePicker
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        onSelect={handleSendTemplate}
      />

      {/* Mobile contact drawer */}
      <Sheet open={contactSheetOpen} onOpenChange={setContactSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[85dvh] max-h-[85dvh] rounded-t-2xl border-wa-border bg-wa-panel p-0 lg:hidden"
        >
          <SheetHeader className="border-b border-wa-border px-4 py-3 text-left">
            <SheetTitle className="text-wa-text">Contact info</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(85dvh-3.5rem)] overflow-hidden">
            <ContactSidebar contact={contact} variant="sheet" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
