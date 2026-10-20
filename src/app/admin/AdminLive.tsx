"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

type N = { id: string; type: string; title: string; body: string | null; link: string | null };

/** Plays a short two-note chime (no audio file needed). Browsers allow it after the first click on the page. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.4);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.45);
    });
  } catch { /* audio unavailable */ }
}

/** Live alerts for the admin: new orders, cancellations, payments to verify. */
export function AdminLive({ userId }: { userId: string }) {
  const [items, setItems] = useState<N[]>([]);
  const titleRef = useRef<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb.channel(`admin-alerts-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => {
        const n = p.new as N;
        setItems((all) => [n, ...all].slice(0, 4));
        if (n.type === "new_order" || n.type === "payment" || n.type === "cancelled") chime();
        if (titleRef.current === null) titleRef.current = document.title;
        document.title = `(!) ${n.title}`;
        window.dispatchEvent(new CustomEvent("gi:admin-refresh"));
      })
      .subscribe();
    const restore = () => { if (titleRef.current) { document.title = titleRef.current; titleRef.current = null; } };
    window.addEventListener("focus", restore);
    return () => { void sb.removeChannel(ch); window.removeEventListener("focus", restore); };
  }, [userId]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0" aria-live="polite">
      <AnimatePresence>
        {items.map((n) => (
          <motion.div key={n.id} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
            className="pointer-events-auto flex gap-3 rounded-2xl border border-nib bg-card p-3.5 shadow-xl shadow-ink/15">
            <motion.span animate={{ rotate: [0, -15, 12, -8, 0] }} transition={{ duration: 0.7 }}><BellRing className="size-5 text-nib" /></motion.span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{n.title}</p>
              {n.body && <p className="text-sm text-muted">{n.body}</p>}
              {n.link && <Link href={n.link} className="mt-1 inline-block text-sm font-semibold text-ink" onClick={() => setItems((a) => a.filter((x) => x.id !== n.id))}>Open</Link>}
            </div>
            <button onClick={() => setItems((a) => a.filter((x) => x.id !== n.id))} className="grid size-7 place-items-center rounded-full hover:bg-paper" aria-label="Dismiss"><X className="size-4" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
