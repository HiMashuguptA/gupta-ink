"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { RotateCcw, Star, ReceiptText, ExternalLink } from "lucide-react";
import { rupees } from "@/lib/format";
import { RETURN_LABEL, RETURN_STEPS, returnTone, type ReturnRow } from "@/lib/returns";
import type { OrderItem, OrderRow } from "@/lib/orders";
import { ReturnDialog } from "./ReturnDialog";
import { ReviewDialog, type MyReview } from "./ReviewDialog";

export type ReturnWithProof = ReturnRow & { proof_url: string | null };

const day = (t: string) => new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function OrderAfterCare({ order, items, returns, reviews: initialReviews, cancelProofUrl }: {
  order: OrderRow; items: OrderItem[]; returns: ReturnWithProof[]; reviews: MyReview[]; cancelProofUrl: string | null;
}) {
  const router = useRouter();
  const [returnOpen, setReturnOpen] = useState(false);
  const [reviewing, setReviewing] = useState<OrderItem | null>(null);
  const [reviews, setReviews] = useState(initialReviews);
  const done = ["delivered", "collected", "completed"].includes(order.status);
  const windowOpen = done && !!order.return_window_ends_at && new Date(order.return_window_ends_at).getTime() > Date.now();

  return (
    <>
      {order.status === "cancelled" && order.refund_due_paise > 0 && (
        <section className={clsx("mt-4 rounded-2xl border p-4 text-sm", order.refunded_at ? "border-ok/30 bg-ok/5" : "border-line bg-card")} aria-label="Refund">
          <p className="flex items-center gap-2 font-bold"><ReceiptText className="size-4" /> {order.refunded_at ? `Refund of ${rupees(order.refund_due_paise)} sent` : `Refund of ${rupees(order.refund_due_paise)} is on its way`}</p>
          <p className="mt-1 text-muted">
            {order.refunded_at ? `To ${order.refund_upi_id ?? "your UPI ID"} on ${day(order.refunded_at)}${order.refund_utr ? ` · UTR ${order.refund_utr}` : ""}.` : `To ${order.refund_upi_id ?? "your UPI ID"}, within 7 working days.`}
          </p>
          {cancelProofUrl && <a href={cancelProofUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-ink">View payment screenshot <ExternalLink className="size-3.5" /></a>}
        </section>
      )}

      {done && (
        <section className="mt-4 rounded-2xl border border-line bg-card p-4" aria-label="Rate your items">
          <h2 className="font-bold">Rate your items</h2>
          <ul className="mt-2 divide-y divide-line">
            {items.map((it) => {
              const r = reviews.find((x) => x.order_item_id === it.id);
              return (
                <li key={it.id} className="flex items-center gap-3 py-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image_url ?? "/brand/logo.svg"} alt="" className="size-10 rounded-lg" />
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{it.name}</p>
                  <button onClick={() => setReviewing(it)} className="flex items-center gap-0.5 rounded-full px-2 py-1 hover:bg-ink-soft" aria-label={r ? `Edit your ${r.stars}-star review of ${it.name}` : `Rate ${it.name}`}>
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={clsx("size-5", r && n <= r.stars ? "fill-nib text-nib" : "text-line")} />)}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(windowOpen || returns.length > 0) && (
        <section className="mt-4 rounded-2xl border border-line bg-card p-4" aria-label="Returns">
          <div className="flex items-center gap-2">
            <h2 className="font-bold">Returns</h2>
            {windowOpen && (
              <button onClick={() => setReturnOpen(true)} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-ink px-3 text-sm font-semibold text-ink">
                <RotateCcw className="size-4" /> Return items
              </button>
            )}
          </div>
          {windowOpen && <p className="mt-1 text-xs text-muted">Something wrong? You can request a return until {day(order.return_window_ends_at!)}.</p>}
          {!windowOpen && done && returns.length > 0 && <p className="mt-1 text-xs text-muted">The return window has closed.</p>}

          <ul className="mt-3 space-y-3">
            {returns.map((r) => {
              const idx = RETURN_STEPS.indexOf(r.status === "pickup_assigned" ? "approved" : r.status);
              return (
                <li key={r.id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-bold", returnTone(r.status))}>{RETURN_LABEL[r.status]}</span>
                    <span className="text-xs text-muted">{day(r.created_at)}</span>
                    <b className="ml-auto">{rupees(r.refund_amount_paise)}</b>
                  </div>
                  <p className="mt-2">{r.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
                  {r.status !== "rejected" && (
                    <div className="mt-2 flex gap-1" aria-hidden>
                      {RETURN_STEPS.map((s, i) => <span key={s} className={clsx("h-1.5 flex-1 rounded-full", i <= idx ? "bg-ink" : "bg-line")} />)}
                    </div>
                  )}
                  {r.admin_note && <p className="mt-2 text-muted">Store: {r.admin_note}</p>}
                  {r.status === "refunded" && (
                    <p className="mt-2 text-ok">Sent to {r.refund_upi_id}{r.refund_utr ? ` · UTR ${r.refund_utr}` : ""}.
                      {r.proof_url && <> <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">View screenshot</a></>}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ReturnDialog open={returnOpen} onClose={() => setReturnOpen(false)} orderId={order.id} onDone={() => router.refresh()} />
      <ReviewDialog item={reviewing ? { id: reviewing.id, name: reviewing.name, image_url: reviewing.image_url } : null}
        existing={reviewing ? reviews.find((r) => r.order_item_id === reviewing.id) ?? null : null}
        onClose={() => setReviewing(null)}
        onSaved={(r) => setReviews((all) => [...all.filter((x) => x.order_item_id !== r.order_item_id), r])} />
    </>
  );
}
