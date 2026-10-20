"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { MapPin, Store, Phone, ChevronLeft, CalendarClock, Bike, XCircle } from "lucide-react";
import clsx from "clsx";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";
import { CANCELLABLE, STATUS_LABEL, statusTone, stepsFor, when, type OrderEvent, type OrderItem, type OrderRow } from "@/lib/orders";
import { UpiPayPanel } from "./UpiPayPanel";
import { CancelDialog } from "./CancelDialog";
import { DeliveryTracker } from "./DeliveryTracker";

export function OrderLive({ initialOrder, items, initialEvents, initialUtr, upi, storePhone, shop }: {
  initialOrder: OrderRow; items: OrderItem[]; initialEvents: OrderEvent[]; initialUtr: string | null;
  upi: { vpa: string; name: string }; storePhone: string; shop: { lat: number; lng: number };
}) {
  const [order, setOrder] = useState(initialOrder);
  const [events, setEvents] = useState(initialEvents);
  const [utr, setUtr] = useState(initialUtr);
  const [cancelOpen, setCancelOpen] = useState(false);
  const params = useSearchParams();
  const router = useRouter();
  const [celebrate, setCelebrate] = useState(params.get("placed") === "1");
  const sb = supabaseBrowser();

  // Live updates: the timeline moves as the store and delivery partner act
  useEffect(() => {
    const ch = sb.channel(`order-${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        (p) => setOrder((o) => ({ ...o, ...(p.new as Partial<OrderRow>) })))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_events", filter: `order_id=eq.${order.id}` },
        (p) => setEvents((e) => (e.some((x) => x.id === (p.new as OrderEvent).id) ? e : [...e, p.new as OrderEvent])))
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [sb, order.id]);

  // Order placed: one celebration, then tidy the URL
  useEffect(() => {
    if (!celebrate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      const colors = ["#1f2a6e", "#e9a23b", "#d9534a", "#3f5bd8"];
      confetti({ particleCount: 110, spread: 90, origin: { y: 0.35 }, colors });
      setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.3 }, colors, scalar: 0.8 }), 300);
    }
    const t = setTimeout(() => { setCelebrate(false); router.replace(`/orders/${order.id}`, { scroll: false }); }, 2600);
    return () => clearTimeout(t);
  }, [celebrate, router, order.id]);

  const steps = stepsFor(order.type);
  const reachedAt = (key: string, also: string[] = []) =>
    events.filter((e) => e.status === key || also.includes(e.status)).at(-1)?.created_at ?? null;
  const currentIndex = useMemo(() => {
    let idx = 0;
    steps.forEach((s, i) => { if (s.key === order.status || s.also?.includes(order.status) || reachedAt(s.key, s.also)) idx = i; });
    return idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status, events]);

  const cancelled = order.status === "cancelled";
  const awaitingUpi = order.payment_method === "upi" && order.status === "placed";
  const fmt = (t: string) => new Date(t).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <AnimatePresence>
        {celebrate && (
          <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-ink-deep/30 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCelebrate(false)}>
            <motion.div initial={{ rotateY: 90, scale: 0.8 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }}
              className="ruled w-full max-w-xs rounded-3xl p-6 pl-12 text-center shadow-2xl" style={{ perspective: 800 }}>
              <svg viewBox="0 0 52 52" className="mx-auto size-16" aria-hidden>
                <circle cx="26" cy="26" r="24" fill="none" stroke="var(--ok)" strokeWidth="3" />
                <motion.path d="M15 27 l8 8 l15 -17" fill="none" stroke="var(--ok)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.5 }} />
              </svg>
              <p className="mt-3 font-display text-2xl font-extrabold">Order placed!</p>
              <p className="font-hand text-2xl text-ink">{order.order_no}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Link href="/orders" className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label="All orders"><ChevronLeft className="size-5" /></Link>
        <div>
          <h1 className="text-xl font-extrabold">Order {order.order_no}</h1>
          <p className="text-xs text-muted">{new Date(order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <span className={clsx("ml-auto rounded-full px-3 py-1 text-xs font-bold", statusTone(order.status))}>{awaitingUpi ? "Awaiting payment" : STATUS_LABEL[order.status]}</span>
      </div>

      {awaitingUpi && <div className="mt-4"><UpiPayPanel order={order} upi={upi} utr={utr} onSubmitted={setUtr} /></div>}

      {(order.status === "agent_accepted" || order.status === "out_for_delivery") && <DeliveryTracker order={order} shop={shop} />}

      {cancelled ? (
        <div className="mt-4 flex gap-3 rounded-2xl border border-margin/30 bg-margin/5 p-4">
          <XCircle className="size-6 shrink-0 text-margin" />
          <div className="text-sm">
            <p className="font-bold">This order was cancelled</p>
            {order.cancel_reason && <p className="text-muted">{order.cancel_reason}</p>}
            {order.refund_due_paise > 0 && <p className="mt-1">A refund of <b>{rupees(order.refund_due_paise)}</b> will be sent to your UPI ID within 7 working days.</p>}
          </div>
        </div>
      ) : (
        <section className="mt-4 rounded-2xl border border-line bg-card p-4" aria-label="Order progress">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted">
            {order.type === "pickup" ? <Store className="size-4" /> : order.type === "scheduled" ? <CalendarClock className="size-4" /> : <Bike className="size-4" />}
            {when(order)}
          </p>
          <ol className="mt-4">
            {steps.map((s, i) => {
              const done = i < currentIndex || (i === currentIndex && ["delivered", "collected", "completed"].includes(order.status));
              const current = i === currentIndex && !done;
              const at = reachedAt(s.key, s.also);
              return (
                <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < steps.length - 1 && (
                    <span className="absolute left-[11px] top-6 h-[calc(100%-18px)] w-0.5 bg-line" aria-hidden>
                      <motion.span className="block w-full bg-ink" initial={false} animate={{ height: i < currentIndex ? "100%" : "0%" }} transition={{ duration: 0.6 }} />
                    </span>
                  )}
                  <span className={clsx("relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2",
                    done ? "border-ink bg-ink" : current ? "border-ink bg-card" : "border-line bg-card")}>
                    {done && <svg viewBox="0 0 12 12" className="size-3"><path d="M2.5 6.2 5 8.5 9.5 3.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
                    {current && <motion.span className="size-2.5 rounded-full bg-nib" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} />}
                  </span>
                  <span className="-mt-0.5">
                    <span className={clsx("block text-sm font-semibold", !done && !current && "text-muted")}>{s.label}</span>
                    {at && (done || current) && <span className="block text-xs text-muted">{fmt(at)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          {order.status === "ready_for_pickup" && <p className="mt-3 rounded-xl bg-nib-soft px-3 py-2 text-sm">Collect it at Khedi Market, opposite Hotel Galaxy, within 48 hours. Show order <b>{order.order_no}</b> at the counter.</p>}
        </section>
      )}

      {order.address && (
        <section className="mt-4 flex gap-3 rounded-2xl border border-line bg-card p-4 text-sm" aria-label="Delivery address">
          <MapPin className="mt-0.5 size-5 shrink-0 text-ink" />
          <div>
            <p className="font-semibold">{order.address.contact_name}, {order.address.contact_phone}</p>
            <p className="text-muted">{order.address.house_name}, {order.address.road}{order.address.landmark ? `, near ${order.address.landmark}` : ""}</p>
          </div>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-line bg-card" aria-label="Items">
        <ul className="divide-y divide-line">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image_url ?? "/brand/logo.svg"} alt="" className="size-12 rounded-lg" />
              <div className="min-w-0 flex-1 text-sm"><p className="truncate font-semibold">{it.name}</p><p className="text-muted">{it.variant_label} × {it.qty}</p></div>
              <p className="text-sm font-semibold">{rupees(it.price_paise * it.qty)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Items</dt><dd>{rupees(order.items_total_paise)}</dd></div>
          {order.coupon_discount_paise > 0 && <div className="flex justify-between text-ok"><dt>Coupon {order.coupon_code}</dt><dd>−{rupees(order.coupon_discount_paise)}</dd></div>}
          {order.coins_used > 0 && <div className="flex justify-between text-ok"><dt>SuperCoins</dt><dd>−{rupees(order.coins_used * 100)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">{order.type === "pickup" ? "Pickup" : "Delivery fee"}</dt><dd>{order.delivery_fee_paise ? rupees(order.delivery_fee_paise) : "Free"}</dd></div>
          {order.fine_paise > 0 && <div className="flex justify-between"><dt className="text-muted">Cancellation fine</dt><dd>{rupees(order.fine_paise)}</dd></div>}
          <div className="flex justify-between border-t border-dashed border-line pt-2 font-extrabold"><dt>Total</dt><dd>{rupees(order.payable_paise)}</dd></div>
          <p className="text-xs text-muted">
            {order.payment_method === "upi" ? "Paid by UPI" : order.payment_method === "cod" ? "Cash on delivery" : "Pay at the counter"}
            {order.payment_status === "paid" ? ", received" : ""}
          </p>
        </dl>
      </section>

      <div className="mt-4 flex flex-wrap gap-2 pb-6">
        <a href={`tel:+91${storePhone}`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-semibold"><Phone className="size-4" /> Call the store</a>
        {CANCELLABLE.includes(order.status) && (
          <button onClick={() => setCancelOpen(true)} className="inline-flex h-11 items-center rounded-xl border border-margin/40 px-4 text-sm font-semibold text-margin">Cancel order</button>
        )}
      </div>

      <CancelDialog open={cancelOpen} onClose={() => setCancelOpen(false)} order={order}
        onCancelled={() => setOrder((o) => ({ ...o, status: "cancelled" }))} />
    </div>
  );
}
