"use client";
import { useSynced } from "@/lib/live";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCheck } from "lucide-react";
import clsx from "clsx";
import { supabaseBrowser } from "@/lib/supabase/client";

type N = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

/** Tapping a notification marks it read (the bell count updates live), then opens it. */
export function NotificationList({ initial, userId }: { initial: N[]; userId: string }) {
  const [items, setItems] = useSynced(initial);
  const sb = supabaseBrowser();
  const router = useRouter();

  useEffect(() => {
    const ch = sb.channel(`notif-list-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (p) => setItems((all) => [p.new as N, ...all]))
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [sb, userId, setItems]);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    const at = new Date().toISOString();
    setItems((all) => all.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? at } : n)));
    await sb.from("notifications").update({ read_at: at }).in("id", ids).is("read_at", null);
    window.dispatchEvent(new Event("ge:notif")); // bell recounts right away
  };

  const open = async (e: React.MouseEvent, n: N) => {
    e.preventDefault();
    if (!n.read_at) await markRead([n.id]);
    if (n.link) router.push(n.link);
  };

  const unread = items.filter((n) => !n.read_at).map((n) => n.id);

  if (!items.length) {
    return (
      <div className="rounded-[16px] bg-card p-8">
        <h2 className="text-[24px] uppercase">No notifications yet</h2>
        <p className="mt-1 text-muted">Order updates, coupons and coin credits will show up here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <p className="num text-sm text-muted">{unread.length ? `${unread.length} unread` : "All caught up"}</p>
        {unread.length > 0 && (
          <button onClick={() => void markRead(unread)} className="press inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-card px-3 text-sm font-semibold text-ink hover:bg-sunk">
            <CheckCheck className="size-4" /> Mark all as read
          </button>
        )}
      </div>
      <ul className="divide-y divide-line rounded-[12px] bg-card">
        <AnimatePresence initial={false}>
          {items.map((n) => (
            <motion.li key={n.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
              <Link href={n.link ?? "#"} onClick={(e) => void open(e, n)}
                className={clsx("flex gap-3 p-4 first:rounded-t-[12px] last:rounded-b-[12px] hover:bg-sunk", !n.read_at && "bg-nib-soft/40")}>
                <motion.span animate={{ scale: n.read_at ? 0 : 1, opacity: n.read_at ? 0 : 1 }} transition={{ duration: 0.2 }}
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-nib" aria-hidden />
                <span className="min-w-0">
                  <span className={clsx("block", n.read_at ? "font-semibold text-muted" : "font-bold")}>{n.title}{!n.read_at && <span className="sr-only"> (unread)</span>}</span>
                  {n.body && <span className="block text-sm text-muted">{n.body}</span>}
                  <span className="mt-1 block text-xs text-muted">{new Date(n.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</span>
                </span>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}
