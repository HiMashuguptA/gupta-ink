"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSynced } from "@/lib/live";
import { BuyAgain } from "./BuyAgain";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { MapPin, Store, Phone, ChevronLeft, CalendarClock, Bike, XCircle, ReceiptText } from "lucide-react";
import clsx from "clsx";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";
import { CANCELLABLE, STATUS_LABEL, statusTone, stepsFor, when, type OrderEvent, type OrderItem, type OrderRow } from "@/lib/orders";
import { UpiPayPanel } from "./UpiPayPanel";
import { CancelDialog } from "./CancelDialog";
import { DeliveryTracker } from "./DeliveryTracker";
import { OrderAfterCare, type ReturnWithProof } from "./OrderAfterCare";
import type { MyReview } from "./ReviewDialog";

export function OrderLive({ initialOrder, items, initialEvents, initialUtr, upi, storePhone, shop, returns, reviews, cancelProofUrl, links }: {
  initialOrder: OrderRow; items: OrderItem[]; initialEvents: OrderEvent[]; initialUtr: string | null;
  upi: { vpa: string; name: string }; storePhone: string; shop: { lat: number; lng: number };
  returns: ReturnWithProof[]; reviews: MyReview[]; cancelProofUrl: string | null; links: Record<string, string>;
}) {
  const [order, setOrder] = useSynced(initialOrder);
  const [events, setEvents] = useSynced(initialEvents);
  const [utr, setUtr] = useSynced(initialUtr);
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
  }, [sb, order.id, setOrder, setEvents]);

  // Order placed: one celebration, then tidy the URL
  useEffect(() => {
    if (!celebrate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      const colors = ["#0b5a45", "#f5b800", "#cf1f2b", "#cf1f2b"];
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
          <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-scrim p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCelebrate(false)}>
            {/* The shop's sign drops in on its strings and swings to rest */}
            <motion.div initial={{ y: -260, rotate: -14 }} animate={{ y: 0, rotate: [-14, 9, -5, 2, 0] }}
              transition={{ y: { type: "spring", duration: 0.6, bounce: 0.3 }, rotate: { duration: 1.5, ease: [0.22, 1, 0.36, 1], times: [0, 0.3, 0.55, 0.8, 1] } }}
              style={{ transformOrigin: "50% -60px" }} className="relative w-full max-w-[290px]">
              <svg viewBox="0 0 290 70" className="absolute -top-[66px] left-0 w-full" aria-hidden>
                <path d="M40 70 L145 6 L250 70" fill="none" stroke="#f4faf6" strokeWidth="3" strokeLinecap="round" />
                <circle cx="145" cy="6" r="5" fill="var(--nib)" />
              </svg>
              <div className="rounded-[16px] bg-sign p-2.5 shadow-float">
                <div className="rounded-[11px] border-[3px] border-nib px-5 py-6 text-center text-on-sign">
                  <svg viewBox="0 0 52 52" className="mx-auto size-14" aria-hidden>
                    <circle cx="26" cy="26" r="23" fill="var(--nib)" />
                    <motion.path d="M15 27 l8 8 l15 -17" fill="none" stroke="#1d1600" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.45, ease: [0.23, 1, 0.32, 1] }} />
                  </svg>
                  <p className="sign-type mt-3 text-[38px]">Order placed</p>
                  <p className="num mt-1 text-sm font-semibold text-on-sign-muted">Order {order.order_no}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Link href="/orders" className="press grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label="All orders"><ChevronLeft className="size-5" /></Link>
        <div>
          <h1 className="text-[30px] uppercase">Order {order.order_no}</h1>
          <p className="text-xs text-muted">{new Date(order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <span className={clsx("ml-auto rounded-full px-3 py-1 text-xs font-bold", statusTone(order.status))}>{awaitingUpi ? "Awaiting payment" : STATUS_LABEL[order.status]}</span>
      </div>

      {awaitingUpi && <div className="mt-4"><UpiPayPanel order={order} upi={upi} utr={utr} onSubmitted={setUtr} /></div>}

      {(order.status === "agent_accepted" || order.status === "out_for_delivery") && <DeliveryTracker order={order} shop={shop} />}

      {cancelled ? (
        <div className="mt-4 flex gap-3 rounded-[12px] bg-margin-soft p-4">
          <XCircle className="size-6 shrink-0 text-margin" />
          <div className="text-sm">
            <p className="font-bold">This order was cancelled</p>
            {order.cancel_reason && <p className="text-muted">{order.cancel_reason}</p>}
          </div>
        </div>
      ) : (
        <section className="mt-4 rounded-[12px] bg-card p-4" aria-label="Order progress">
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
                    <span className="absolute left-[11px] top-6 h-[calc(100%-18px)] w-[3px] overflow-hidden rounded-full bg-sunk" aria-hidden>
                      {/* The line fills down to the current step (Aceternity "Tracing beam") */}
                      <motion.span className="block h-full w-full origin-top rounded-full bg-ink" initial={{ scaleY: 0 }} animate={{ scaleY: i < currentIndex ? 1 : 0 }}
                        transition={{ duration: 0.55, delay: 0.15 + i * 0.12, ease: [0.23, 1, 0.32, 1] }} />
                    </span>
                  )}
                  <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.4, bounce: 0.35, delay: 0.1 + i * 0.12 }}
                    className={clsx("relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2",
                    done ? "border-ink bg-ink" : current ? "border-nib bg-card" : "border-rule bg-card")}>
                    {done && <svg viewBox="0 0 12 12" className="size-3"><path d="M2.5 6.2 5 8.5 9.5 3.5" stroke="var(--on-ink)" strokeWidth="2.2" fill="none" strokeLinecap="round" /></svg>}
                    {current && <span className="relative size-2.5 rounded-full bg-nib"><span className="absolute inset-0 animate-ping rounded-full bg-nib/60 [animation-duration:1.8s]" /></span>}
                  </motion.span>
                  <span className="-mt-0.5">
                    <span className={clsx("block text-sm font-semibold", !done && !current && "text-muted", current && "text-graphite")}>{s.label}{current && <span className="ml-2 rounded-[5px] bg-nib-soft px-1.5 py-0.5 text-[11px] font-bold text-graphite">Now</span>}</span>
                    {at && (done || current) && <span className="block text-xs text-muted">{fmt(at)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          {order.status === "ready_for_pickup" && <p className="mt-3 rounded-[10px] bg-nib-soft px-3 py-2 text-sm">Collect it at Khedi Market, opposite Hotel Galaxy, within 48 hours. Show order <b>{order.order_no}</b> at the counter.</p>}
        </section>
      )}

      {order.address && (
        <section className="mt-4 flex gap-3 rounded-[12px] bg-card p-4 text-sm" aria-label="Delivery address">
          <MapPin className="mt-0.5 size-5 shrink-0 text-ink" />
          <div>
            <p className="font-semibold">{order.address.contact_name}, {order.address.contact_phone}</p>
            <p className="text-muted">{order.address.house_name}, {order.address.road}{order.address.landmark ? `, near ${order.address.landmark}` : ""}</p>
          </div>
        </section>
      )}
      {order.type === "pickup" && order.pickup_contact && (
        <section className="mt-4 flex gap-3 rounded-[12px] bg-card p-4 text-sm" aria-label="Pickup details">
          <Store className="mt-0.5 size-5 shrink-0 text-ink" />
          <div>
            <p className="font-semibold">Collected by {order.pickup_contact.name}, {order.pickup_contact.phone}</p>
            <p className="text-muted">Gupta Enterprises, Khedi Market, opposite Hotel Galaxy, Kohima</p>
          </div>
        </section>
      )}

      <OrderAfterCare order={order} items={items} returns={returns} reviews={reviews} cancelProofUrl={cancelProofUrl} links={links} />

      <section className="mt-4 rounded-[12px] bg-card" aria-label="Items">
        <ul className="divide-y divide-line">
          {items.map((it) => (
            <li key={it.id}>
              {(() => {
                const body = (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.image_url ?? "/brand/logo.svg"} alt="" className="size-12 rounded-[8px]" />
                    <div className="min-w-0 flex-1 text-sm"><p className={clsx("truncate font-semibold", links[it.product_id] && "text-ink")}>{it.name}</p><p className="text-muted">{it.variant_label} × {it.qty}</p></div>
                    <p className="text-sm font-semibold">{rupees(it.price_paise * it.qty)}</p>
                  </>
                );
                return links[it.product_id]
                  ? <Link href={links[it.product_id]} className="flex items-center gap-3 p-3 hover:bg-paper" aria-label={`Open ${it.name}`}>{body}</Link>
                  : <div className="flex items-center gap-3 p-3">{body}</div>;
              })()}
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
        <Link href={`/bill/${order.id}`} className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-ink bg-card px-4 text-sm font-semibold text-ink"><ReceiptText className="size-4" /> View bill</Link>
        <a href={`tel:+91${storePhone}`} className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line bg-card px-4 text-sm font-semibold"><Phone className="size-4" /> Call the store</a>
        {["delivered", "collected", "completed", "cancelled"].includes(order.status) && <BuyAgain items={items.map((i) => ({ product_id: i.product_id, qty: i.qty }))} />}
        {CANCELLABLE.includes(order.status) && (
          <button onClick={() => setCancelOpen(true)} className="inline-flex h-11 items-center rounded-[10px] border border-margin/40 px-4 text-sm font-semibold text-margin">Cancel order</button>
        )}
      </div>

      <CancelDialog open={cancelOpen} onClose={() => setCancelOpen(false)} order={order}
        onCancelled={() => setOrder((o) => ({ ...o, status: "cancelled" }))} />
    </div>
  );
}
