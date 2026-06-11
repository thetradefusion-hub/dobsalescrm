"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Conversation } from "@/types";

type Listener = (total: number) => void;

/** Shared across Sidebar + MobileBottomNav — one realtime channel only. */
let channel: RealtimeChannel | null = null;
let subscriberCount = 0;
let sharedTotal = 0;
let bootstrapping = false;

const counts = new Map<string, number>();
const listeners = new Set<Listener>();

function recompute() {
  let sum = 0;
  for (const n of counts.values()) if (n > 0) sum += 1;
  sharedTotal = sum;
  for (const listener of listeners) listener(sharedTotal);
}

function onConversationChange(payload: {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) {
  if (payload.eventType === "DELETE") {
    const oldRow = payload.old as Partial<Conversation>;
    if (oldRow.id) counts.delete(oldRow.id);
  } else {
    const row = payload.new as unknown as Conversation
    counts.set(row.id, row.unread_count ?? 0)
  }
  recompute();
}

async function bootstrapChannel() {
  if (channel || bootstrapping) return;
  bootstrapping = true;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("id, unread_count");

  if (!error && data) {
    counts.clear();
    for (const row of data as { id: string; unread_count: number }[]) {
      counts.set(row.id, row.unread_count ?? 0);
    }
    recompute();
  }

  // A subscriber may have unmounted while we were fetching.
  if (subscriberCount === 0) {
    bootstrapping = false;
    return;
  }

  channel = supabase
    .channel("total-unread-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations" },
      onConversationChange,
    )
    .subscribe();

  bootstrapping = false;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  subscriberCount += 1;

  listener(sharedTotal);

  if (subscriberCount === 1) {
    void bootstrapChannel();
  }

  return () => {
    listeners.delete(listener);
    subscriberCount -= 1;

    if (subscriberCount === 0 && channel) {
      createClient().removeChannel(channel);
      channel = null;
      bootstrapping = false;
    }
  };
}

/**
 * Count of conversations with at least one unread inbound message for
 * the current user. Used by the sidebar and mobile nav inbox badge.
 *
 * Uses a module-level singleton channel so multiple components can call
 * this hook without colliding on the same Supabase channel name.
 */
export function useTotalUnread(): number {
  const [total, setTotal] = useState(sharedTotal);

  useEffect(() => subscribe(setTotal), []);

  return total;
}
