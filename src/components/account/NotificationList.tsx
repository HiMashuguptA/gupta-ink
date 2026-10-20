"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabase/client";

type N = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export function NotificationList({ initial, userId }: { initial: N[]; userId: string }) {
  const [items, setItems] = useState(initial);
  const sb = supabaseBrowser();

  useEffect(() => {
    const unread = initial.filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length) void sb.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unread);
    const ch = sb.channel(`notif-list-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (p) => setItems((all) => [p.new as N, ...all]))
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [sb, userId, initial]);

  if (!items.length) {
    return (
      <div className="ruled rounded-3xl p-8 pl-14">
        <h2 className="text-lg font-bold">No notifications yet</h2>
        <p className="mt-1 text-muted">Order updates, coupons and coin credits will show up here.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
      <AnimatePresence initial={false}>
        {items.map((n) => (
          <motion.li key={n.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <Link href={n.link ?? "#"} className="flex gap-3 p-4 hover:bg-paper">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-nib"}`} aria-hidden />
              <span className="min-w-0">
                <span className="block font-semibold">{n.title}</span>
                {n.body && <span className="block text-sm text-muted">{n.body}</span>}
                <span className="mt-1 block text-xs text-muted">{new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
              </span>
            </Link>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
