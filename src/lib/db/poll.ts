"use client";
import type { Rest } from "./rest";

/**
 * Live updates without websockets. Same shape as the old realtime channel:
 *   db.channel("x").on("postgres_changes", { event, table, filter }, cb).subscribe()
 * Each watched table is asked "anything newer than the last row I saw?" every few seconds
 * while the tab is visible. Row security means people only ever see their own rows.
 */
type Change = { eventType: string; new: Record<string, unknown> };
type Spec = { event?: string; schema?: string; table: string; filter?: string };
type Handler = Spec & { cb: (p: Change) => void; last?: string };

const STAMP: Record<string, string> = {
  notifications: "created_at", order_events: "created_at", reviews: "created_at", search_logs: "created_at",
  cart_items: "added_at", agent_locations: "updated_at",
};
const EVERY: Record<string, number> = { agent_locations: 4000, orders: 6000, order_events: 6000, notifications: 30000 };

export class PollChannel {
  private handlers: Handler[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private idle = 0;
  constructor(private rest: Rest) {}

  on(_kind: "postgres_changes", spec: Spec, cb: (p: Change) => void) {
    this.handlers.push({ ...spec, cb });
    return this;
  }

  private query(h: Handler) {
    const col = STAMP[h.table] ?? (h.event === "INSERT" ? "created_at" : "updated_at");
    // The generated types don't know every table name passed in at runtime
    let q = (this.rest.from(h.table as never) as unknown as { select: (s: string) => any }).select("*"); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (h.filter) {
      const m = h.filter.match(/^([a-z_]+)=([a-z]+)\.(.+)$/);
      if (m) q = q.filter(m[1], m[2], m[3]);
    }
    return { q, col };
  }

  private async tick() {
    if (this.stopped) return;
    let next = 15000;
    let changed = false;
    if (typeof document === "undefined" || document.visibilityState === "visible") {
      await Promise.all(this.handlers.map(async (h) => {
        next = Math.min(next, EVERY[h.table] ?? 12000);
        const { q, col } = this.query(h);
        if (h.last === undefined) {
          const { data } = await q.order(col, { ascending: false }).limit(1);
          h.last = (data?.[0]?.[col] as string) ?? "1970-01-01T00:00:00Z";
          return;
        }
        const { data } = await q.gt(col, h.last).order(col, { ascending: true }).limit(50);
        for (const row of (data ?? []) as Record<string, unknown>[]) {
          h.last = String(row[col]);
          h.cb({ eventType: h.event === "*" || !h.event ? "UPDATE" : h.event, new: row });
          changed = true;
        }
      })).catch(() => {});
    }
    // Slow down gently while nothing changes (up to 4x), back to normal as soon as something does
    this.idle = changed ? 0 : Math.min(this.idle + 1, 30);
    next = Math.round(next * (1 + Math.min(this.idle, 30) / 10));
    if (!this.stopped) this.timer = setTimeout(() => void this.tick(), next);
  }

  subscribe(status?: (s: string) => void) {
    void this.tick();
    status?.("SUBSCRIBED");
    return this;
  }

  unsubscribe() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }
}
