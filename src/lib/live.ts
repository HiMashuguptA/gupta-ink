"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export type LiveSpec = { table: string; filter?: string; event?: "*" | "INSERT" | "UPDATE" | "DELETE" };

/**
 * Calls `onChange` (bundled, at most every `waitMs`) whenever a watched table changes.
 * Also catches what a live connection can miss: it re-checks when the tab comes back
 * into view, when the connection reconnects, and every `pollMs` if live updates are down.
 */
export function useLive(key: string, specs: LiveSpec[], onChange: () => void, { waitMs = 600, pollMs = 45_000, enabled = true } = {}) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const specKey = JSON.stringify(specs);

  useEffect(() => {
    if (!enabled) return;
    const sb = supabaseBrowser();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let healthy = false;
    let joinedOnce = false;
    let hiddenAt = 0;
    const fire = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; cb.current(); }, waitMs);
    };

    let ch = sb.channel(`live:${key}:${Math.random().toString(36).slice(2, 8)}`);
    for (const s of JSON.parse(specKey) as LiveSpec[]) {
      ch = ch.on("postgres_changes", { event: s.event ?? "*", schema: "public", table: s.table, ...(s.filter ? { filter: s.filter } : {}) }, fire);
    }
    // Make sure the live connection carries this person's sign-in, so row security lets their rows through
    void sb.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) void sb.realtime.setAuth(data.session.access_token);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (joinedOnce) fire(); // reconnected: catch up on anything missed
          joinedOnce = true;
          healthy = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          healthy = false;
        }
      });
    });

    const onVisible = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 10_000) fire();
    };
    document.addEventListener("visibilitychange", onVisible);
    const poll = setInterval(() => { if (!healthy && document.visibilityState === "visible") fire(); }, pollMs);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      void sb.removeChannel(ch);
    };
  }, [key, specKey, waitMs, pollMs, enabled]);
}

/** Keeps local state in step with server props after a refresh, without losing it in between. */
export function useSynced<T>(value: T) {
  const [state, setState] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setState(value);
  }
  return [state, setState] as const;
}
