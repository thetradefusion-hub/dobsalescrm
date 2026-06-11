"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Send, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  conversationId: string;
  sessionExpired: boolean;
  onSend: (text: string) => void;
  onOpenTemplates: () => void;
}

export function MessageComposer({
  conversationId,
  sessionExpired,
  onSend,
  onOpenTemplates,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || sessionExpired) return;

    setSending(true);
    try {
      onSend(trimmed);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
    }
  }, [text, sending, sessionExpired, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      adjustHeight();
    },
    [adjustHeight],
  );

  return (
    <div
      className="shrink-0 border-t border-wa-border bg-wa-header/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:px-3 lg:bg-wa-panel"
      data-conversation={conversationId}
    >
      {sessionExpired && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            24-hour session expired. Use a template to re-engage.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-xs text-amber-800 hover:text-amber-900 dark:text-amber-300"
            onClick={onOpenTemplates}
          >
            <LayoutTemplate className="mr-1 h-3.5 w-3.5" />
            Templates
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-11 w-11 shrink-0 rounded-full p-0 text-wa-muted hover:bg-wa-surface hover:text-wa-text"
          onClick={onOpenTemplates}
          title="Send template"
        >
          <LayoutTemplate className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 flex-1 items-end gap-2 rounded-3xl border border-wa-border bg-wa-panel px-3 py-1.5 shadow-sm lg:rounded-xl lg:bg-wa-surface">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              sessionExpired ? "Session expired" : "Message"
            }
            disabled={sessionExpired}
            rows={1}
            className={cn(
              "max-h-[120px] min-h-[2.25rem] flex-1 resize-none bg-transparent py-2 text-[15px] text-wa-text placeholder:text-wa-muted outline-none lg:text-sm",
              sessionExpired && "cursor-not-allowed opacity-50",
            )}
          />
        </div>

        <Button
          size="sm"
          className={cn(
            "h-11 w-11 shrink-0 rounded-full p-0 shadow-sm transition-transform active:scale-95",
            text.trim() && !sessionExpired
              ? "bg-wa-green text-white hover:bg-wa-teal hover:text-white"
              : "bg-wa-surface text-wa-muted",
          )}
          disabled={!text.trim() || sessionExpired || sending}
          onClick={handleSend}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <p className="mt-1 hidden pl-14 text-[10px] text-wa-muted lg:block">
        Type &apos;/&apos; for quick replies · Enter to send
      </p>
    </div>
  );
}
