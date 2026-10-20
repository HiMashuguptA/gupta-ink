"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSynced } from "@/lib/live";
import clsx from "clsx";
import { rupees } from "@/lib/format";
import { STATUS_LABEL, statusTone, when, type OrderRow } from "@/lib/orders";

export type BoardOrder = Pick<OrderRow, "id" | "order_no" | "status" | "type" | "payable_paise" | "payment_method" | "payment_status" | "created_at" | "slot_date" | "slot_start" | "slot_end" | "refund_due_paise" | "refunded_at" | "address"> & {
  profiles: { name: string | null; phone: string | null } | null;
  payments: { utr: string | null; status: string }[];
};

const TABS = [
  { key: "action", label: "Needs action", test: (o: BoardOrder) => o.status === "confirmed" || (o.status === "placed" && !!o.payments[0]?.utr) || o.status === "packed" },
  { key: "progress", label: "In progress", test: (o: BoardOrder) => ["getting_ready", "agent_assigned", "agent_accepted"].includes(o.status) },
  { key: "out", label: "Out / ready", test: (o: BoardOrder) => ["out_for_delivery", "ready_for_pickup"].includes(o.status) },
  { key: "unpaid", label: "Awaiting UPI", test: (o: BoardOrder) => o.status === "placed" && !o.payments[0]?.utr },
  { key: "done", label: "Done", test: (o: BoardOrder) => ["delivered", "collected", "completed"].includes(o.status) },
  { key: "cancelled", label: "Cancelled", test: (o: BoardOrder) => o.status === "cancelled" },
] as const;

export function OrdersBoard({ initial }: { initial: BoardOrder[] }) {
  // The admin layout refreshes this page whenever an order changes; keep the list in step with it
  const [orders] = useSynced(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("action");
  const [q, setQ] = useState("");

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, orders.filter(t.test).length])), [orders]);
  const shown = useMemo(() => {
    const t = TABS.find((x) => x.key === tab)!;
    const term = q.trim().toLowerCase();
    return orders.filter((o) => t.test(o) && (!term || `${o.order_no} ${o.profiles?.name ?? ""} ${o.profiles?.phone ?? ""}`.toLowerCase().includes(term)));
  }, [orders, tab, q]);

  return (
    <div className="mt-5">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
            className={clsx("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold",
              tab === t.key ? "border-ink bg-ink text-white" : "border-line bg-card")}>
            {t.label}
            {counts[t.key] > 0 && <span className={clsx("grid min-w-5 place-items-center rounded-full px-1 text-[11px]", tab === t.key ? "bg-white/20" : "bg-nib text-ink-deep")}>{counts[t.key]}</span>}
          </button>
        ))}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order number, name or phone" aria-label="Search orders"
        className="mt-3 h-11 w-full max-w-md rounded-xl border border-line bg-card px-3 outline-none focus:border-ink" />

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="p-3 font-semibold">Order</th><th className="p-3 font-semibold">Customer</th><th className="p-3 font-semibold">When</th>
              <th className="p-3 font-semibold">Payment</th><th className="p-3 text-right font-semibold">Total</th><th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => {
              const utr = o.payments[0]?.utr;
              return (
                <tr key={o.id} className="border-t border-line hover:bg-paper">
                  <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-bold text-ink hover:underline">{o.order_no}</Link>
                    <span className="block text-xs text-muted">{new Date(o.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></td>
                  <td className="p-3">{o.profiles?.name ?? "Customer"}<span className="block text-xs text-muted">{o.address?.contact_phone ?? o.profiles?.phone ?? ""}</span></td>
                  <td className="p-3">{when(o)}</td>
                  <td className="p-3">
                    {o.payment_method === "upi" ? "UPI" : o.payment_method === "cod" ? "Cash on delivery" : "At counter"}
                    <span className={clsx("block text-xs", o.payment_status === "paid" ? "text-ok" : utr ? "font-semibold text-nib" : "text-muted")}>
                      {o.payment_status === "paid" ? "Paid" : utr ? `Check UTR ${utr}` : "Not paid yet"}
                    </span>
                    {o.refund_due_paise > 0 && !o.refunded_at && <span className="block text-xs font-semibold text-margin">Refund due {rupees(o.refund_due_paise)}</span>}
                  </td>
                  <td className="p-3 text-right font-bold">{rupees(o.payable_paise)}</td>
                  <td className="p-3"><span className={clsx("rounded-full px-2.5 py-1 text-xs font-bold", statusTone(o.status))}>{STATUS_LABEL[o.status]}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!shown.length && <p className="p-6 text-center text-sm text-muted">Nothing here right now.</p>}
      </div>
    </div>
  );
}
