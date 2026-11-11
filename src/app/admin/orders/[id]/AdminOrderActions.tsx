"use client";
import { refreshCatalog } from "@/app/actions/admin";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";
import type { OrderRow, OrderStatus } from "@/lib/orders";
import { RefundProofForm } from "../../RefundProofForm";

type Agent = { id: string; name: string | null; phone: string | null; agent_online: boolean };

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }[]>> = {
  confirmed: [{ to: "getting_ready", label: "Start getting it ready" }],
  getting_ready: [{ to: "packed", label: "Mark packed" }],
  agent_assigned: [{ to: "agent_accepted", label: "Partner accepted (on their behalf)" }, { to: "packed", label: "Unassign partner" }],
  agent_accepted: [{ to: "out_for_delivery", label: "Mark out for delivery" }],
  out_for_delivery: [{ to: "delivered", label: "Mark delivered" }],
  ready_for_pickup: [{ to: "collected", label: "Customer collected it" }],
};

export function AdminOrderActions({ order, utr, agents, paidOnline = false, refunds = [] }: {
  order: OrderRow; utr: string | null; agents: Agent[];
  paidOnline?: boolean; refunds?: { id: string; amount_paise: number; status: string; return_id: string | null; error: string | null }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [agent, setAgent] = useState(order.agent_id ?? agents[0]?.id ?? "");
  const [ref, setRef] = useState(utr ?? "");
  const sb = supabaseBrowser();

  // Reflect changes made elsewhere (customer cancels, agent actions)
  useEffect(() => {
    const ch = sb.channel(`admin-order-${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, () => router.refresh())
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [sb, order.id, router]);

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true); setMsg(null);
    const { error } = await fn();
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: ok });
    void refreshCatalog(); // cancellations put stock back
    router.refresh();
  };

  const move = (to: OrderStatus, label: string) => run(() => sb.rpc("admin_set_order_status", { p_order: order.id, p_status: to }), `${label}: done. The customer was notified.`);
  const cancel = () => {
    const reason = window.prompt("Reason for cancelling (the customer will see this):", "Item out of stock");
    if (!reason) return;
    void run(() => sb.rpc("admin_set_order_status", { p_order: order.id, p_status: "cancelled", p_note: reason }), "Order cancelled. Stock and coupons were restored.");
  };

  const s = order.status;
  const terminal = ["delivered", "collected", "completed", "cancelled"].includes(s);
  const needsPayment = order.payment_method === "upi" && order.payment_status !== "paid" && s !== "cancelled";

  return (
    <section className="rounded-[12px] border-[1.5px] border-ink bg-card p-4" aria-label="Order actions">
      <h2 className="font-bold">Next step</h2>

      {needsPayment && (
        <div className="mt-3 rounded-[10px] bg-nib-soft p-3 text-sm">
          <p className="font-semibold">{utr ? "Customer submitted a UPI reference" : "Waiting for the customer's UPI payment"}</p>
          <p className="text-muted">Check your bank or UPI app for {rupees(order.payable_paise)} with note {order.order_no}{utr ? ` and reference ${utr}` : ""}.</p>
          <input value={ref} onChange={(e) => setRef(e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12-digit UTR (optional)" inputMode="numeric"
            className="mt-2 h-10 w-full rounded-[8px] border border-line bg-card px-3 outline-none focus:border-ink" aria-label="UPI reference" />
          <button disabled={busy} onClick={() => run(() => sb.rpc("admin_mark_paid", { p_order: order.id, p_utr: ref || undefined }), "Payment verified. Order confirmed.")}
            className="mt-2 h-10 w-full rounded-[8px] bg-ok font-semibold text-white disabled:opacity-50">Payment received, confirm order</button>
        </div>
      )}

      {s === "packed" && order.type !== "pickup" && (
        <div className="mt-3">
          {agents.length ? (
            <>
              <label htmlFor="agent" className="text-sm font-semibold">Assign delivery partner</label>
              <select id="agent" value={agent} onChange={(e) => setAgent(e.target.value)} className="mt-1 h-10 w-full rounded-[8px] border border-line bg-paper px-2">
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name ?? "Agent"}{a.agent_online ? " (online)" : ""}</option>)}
              </select>
              <button disabled={busy || !agent} onClick={() => run(() => sb.rpc("admin_assign_agent", { p_order: order.id, p_agent: agent }), "Partner assigned and notified.")}
                className="mt-2 h-10 w-full rounded-[8px] bg-ink font-semibold text-on-ink disabled:opacity-50">Assign</button>
            </>
          ) : (
            <p className="text-sm text-muted">No delivery agents yet. Give someone the &ldquo;Delivery agent&rdquo; role in Users and roles.</p>
          )}
        </div>
      )}
      {s === "packed" && order.type === "pickup" && (
        <button disabled={busy} onClick={() => move("ready_for_pickup", "Ready for pickup")} className="mt-3 h-10 w-full rounded-[8px] bg-ink font-semibold text-on-ink disabled:opacity-50">Ready for pickup</button>
      )}

      <div className="mt-3 grid gap-2">
        {(NEXT[s] ?? []).map((n) => (
          <button key={n.to} disabled={busy} onClick={() => move(n.to, n.label)}
            className={n.to === "packed" && s === "agent_assigned" ? "h-10 rounded-[8px] border border-line font-semibold disabled:opacity-50" : "h-10 rounded-[8px] bg-ink font-semibold text-on-ink disabled:opacity-50"}>
            {n.label}
          </button>
        ))}
      </div>

      {!terminal && s !== "out_for_delivery" && (
        <button disabled={busy} onClick={cancel} className="mt-3 h-10 w-full rounded-[8px] border border-margin/40 font-semibold text-margin disabled:opacity-50">Cancel order</button>
      )}
      {terminal && <p className="mt-2 text-sm text-muted">{s === "cancelled" ? `Cancelled${order.cancelled_by ? ` by ${order.cancelled_by}` : ""}.` : "Nothing more to do here. Returns are under Returns and refunds."}</p>}
      {refunds.filter((g) => !g.return_id).map((g) => (
        <div key={g.id} className={`mt-3 rounded-[8px] px-3 py-2 text-sm ${g.status === "success" ? "bg-ok/10 text-ok" : g.status === "failed" ? "bg-margin/10 text-margin" : "bg-ink-soft"}`}>
          <p className="font-semibold">Cashfree refund {rupees(g.amount_paise)}: {g.status === "success" ? "sent" : g.status === "failed" ? "failed" : g.status === "pending" ? "with the bank" : "queued"}</p>
          {g.status === "failed" && (
            <>
              <p className="text-xs">{g.error}</p>
              <button disabled={busy} onClick={async () => {
                const { error } = await (sb.rpc("admin_retry_refund" as never, { p_id: g.id } as never) as unknown as PromiseLike<{ error: { message: string } | null }>);
                setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Refund queued again." });
              }} className="mt-1 h-9 rounded-[8px] bg-ink px-3 text-xs font-semibold text-on-ink">Try again</button>
            </>
          )}
        </div>
      ))}
      {s === "cancelled" && order.refund_due_paise > 0 && (!paidOnline || refunds.some((g) => !g.return_id && g.status === "failed")) && (order.refunded_at
        ? <p className="mt-2 text-sm font-semibold text-ok">Refund of {rupees(order.refund_due_paise)} sent{order.refund_utr ? `, UTR ${order.refund_utr}` : ""}.</p>
        : <div className="mt-3"><RefundProofForm customerId={order.user_id} amountPaise={order.refund_due_paise} upiId={order.refund_upi_id}
            submit={(path, utr) => sb.rpc("admin_mark_refund_paid", { p_order: order.id, p_proof_path: path, p_utr: utr })} /></div>)}
      {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-ok" : "text-margin"}`} role="status">{msg.text}</p>}
    </section>
  );
}
