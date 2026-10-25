"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bike, Store, PackageCheck, ChevronUp, X, CalendarClock, ClipboardCheck } from "lucide-react";
import clsx from "clsx";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { useLive } from "@/lib/live";
import { STATUS_LABEL, stepsFor, when, type OrderRow } from "@/lib/orders";

type Mini = Pick<OrderRow, "id" | "order_no" | "type" | "status" | "slot_date" | "slot_start" | "slot_end" | "created_at">;
const DONE = ["delivered", "collected", "completed", "cancelled"];

function line(o: Mini) {
  switch (o.status) {
    case "placed": return "Waiting for the store to confirm";
    case "confirmed": case "getting_ready": return o.type === "scheduled" ? when(o) : "Your items are being picked";
    case "packed": return o.type === "pickup" ? "Packed, getting ready for the counter" : "Packed, finding a delivery partner";
    case "agent_assigned": return "A delivery partner is assigned";
    case "agent_accepted": case "out_for_delivery": return "On the way to you";
    case "ready_for_pickup": return "Ready at Khedi Market counter";
    default: return STATUS_LABEL[o.status];
  }
}
function Icon({ o, className }: { o: Mini; className?: string }) {
  if (o.status === "ready_for_pickup" || o.type === "pickup") return <Store className={className} />;
  if (["agent_accepted", "out_for_delivery", "agent_assigned"].includes(o.status)) return <Bike className={className} />;
  if (o.status === "packed") return <PackageCheck className={className} />;
  if (o.type === "scheduled") return <CalendarClock className={className} />;
  return <ClipboardCheck className={className} />;
}

/**
 * Live order island (after Skiper's "Dynamic island"): a dark pill docked above the tab bar
 * on every shop page while an order is on its way. Tap to expand into the progress steps.
 */
export function OrderIsland() {
  const { user } = useSession();
  const path = usePathname();
  const reduce = useReducedMotion();
  const [orders, setOrders] = useState<Mini[]>([]);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [hidden, setHidden] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return setOrders([]);
    const { data } = await supabaseBrowser().from("orders")
      .select("id, order_no, type, status, slot_date, slot_start, slot_end, created_at")
      .eq("user_id", user.id).not("status", "in", `(${DONE.join(",")})`)
      .order("created_at", { ascending: false }).limit(3);
    setOrders((data ?? []) as Mini[]);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  useLive(`island-${user?.id ?? "anon"}`, [{ table: "orders", filter: `user_id=eq.${user?.id}` }], () => void load(), { enabled: !!user, waitMs: 300 });

  useEffect(() => { setOpen(false); }, [path]);
  const list = orders.filter((o) => o.id !== hidden);
  const o = list[Math.min(i, list.length - 1)];
  // Not on screens where it would sit on top of the main action, or repeat the page it opens
  const off = !o || path.startsWith("/cart") || path.startsWith("/orders") || path.startsWith("/login") || path.startsWith("/p/");

  // Keep page content clear of the island: pages read this to add room at the bottom
  useEffect(() => {
    document.documentElement.style.setProperty("--island-pad", off ? "0px" : "64px");
    return () => { document.documentElement.style.setProperty("--island-pad", "0px"); };
  }, [off]);

  const steps = o ? stepsFor(o.type) : [];
  const at = o ? Math.max(0, steps.findIndex((s) => s.key === o.status || s.also?.includes(o.status))) : 0;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, duration: 0.45, bounce: 0.22 };

  return (
    <AnimatePresence>
      {!off && (
        <motion.div key="island" initial={{ y: 40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0, scale: 0.92 }}
          transition={spring} style={{ viewTransitionName: "order-island" }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 md:bottom-6 md:justify-end md:px-6">
          <motion.div layout transition={spring} style={{ borderRadius: open ? 22 : 28 }}
            data-pet-avoid className="pointer-events-auto w-auto max-w-[420px] overflow-hidden bg-[#0b1914] text-white shadow-float">
            {!open ? (
              <motion.button layout="position" onClick={() => setOpen(true)} className="flex items-center gap-2.5 py-2 pl-2 pr-3.5 text-left"
                aria-label={`Order ${o.order_no}: ${STATUS_LABEL[o.status]}. Show progress`}>
                <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-nib text-on-nib">
                  <Icon o={o} className="size-[18px]" />
                  {/* One pulse each time the status changes, not an endless loop */}
                  {!reduce && <motion.span key={o.status} className="absolute inset-0 rounded-full bg-nib" initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }} aria-hidden />}
                </span>
                <span className="min-w-0">
                  <span className="sign-type block text-[17px] text-nib">{STATUS_LABEL[o.status]}</span>
                  <span className="block max-w-[210px] truncate text-[12px] text-white/70">{line(o)}</span>
                </span>
                {list.length > 1 && <span className="num ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold">{list.length}</span>}
                <ChevronUp className="ml-0.5 size-4 shrink-0 text-white/60" />
              </motion.button>
            ) : (
              <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, delay: 0.06 }} className="w-[min(92vw,400px)] p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nib text-on-nib"><Icon o={o} className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="sign-type text-[22px] text-nib">{STATUS_LABEL[o.status]}</p>
                    <p className="text-[13px] text-white/75">{line(o)}</p>
                  </div>
                  <button onClick={() => setOpen(false)} className="press grid size-8 place-items-center rounded-full bg-white/10" aria-label="Collapse"><X className="size-4" /></button>
                </div>
                <ol className="mt-4 flex gap-1" aria-label={`Step ${at + 1} of ${steps.length}`}>
                  {steps.map((s, k) => (
                    <li key={s.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15" title={s.label}>
                      <motion.span className="block h-full rounded-full bg-nib" initial={{ scaleX: 0 }} animate={{ scaleX: k <= at ? 1 : 0 }}
                        style={{ transformOrigin: "0 50%" }} transition={{ ...spring, delay: reduce ? 0 : k * 0.05 }} />
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-[12px] text-white/60">Order {o.order_no} · {when(o)}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/orders/${o.id}`} className="press flex h-10 flex-1 items-center justify-center rounded-[10px] bg-nib text-sm font-bold text-on-nib">Track order</Link>
                  {list.length > 1 && (
                    <button onClick={() => setI((x) => (x + 1) % list.length)} className="press h-10 rounded-[10px] bg-white/10 px-3 text-sm font-semibold">Next order</button>
                  )}
                  <button onClick={() => { setHidden(o.id); setOpen(false); }} className={clsx("press h-10 rounded-[10px] px-3 text-sm font-semibold text-white/70 hover:text-white")}>Hide</button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
