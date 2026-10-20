"use client";
import { refreshCatalog } from "@/app/actions/admin";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ReturnRow } from "@/lib/returns";
import { RefundProofForm } from "../../RefundProofForm";

export function ReturnActions({ ret, isPickupOrder, agents }: { ret: ReturnRow; isPickupOrder: boolean; agents: { id: string; name: string | null; agent_online: boolean }[] }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [agent, setAgent] = useState(ret.agent_id ?? agents[0]?.id ?? "");
  const [restock, setRestock] = useState(true);

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true); setMsg(null);
    const { error } = await fn();
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: ok });
    void refreshCatalog(); // restocked items show in the shop again
    router.refresh();
  };
  const reject = () => {
    const note = window.prompt("Why isn't this return approved? The customer will see this.", "The item doesn't look damaged in the photos.");
    if (note) void run(() => sb.rpc("admin_review_return", { p_return: ret.id, p_approve: false, p_note: note }), "Return rejected. The customer was told.");
  };
  const s = ret.status;
  const btn = "h-10 w-full rounded-lg font-semibold disabled:opacity-50";

  return (
    <section className="rounded-2xl border-[1.5px] border-ink bg-card p-4" aria-label="Return actions">
      <h2 className="font-bold">Next step</h2>
      <div className="mt-3 space-y-2 text-sm">
        {s === "requested" && (
          <>
            <p className="text-muted">Check the photos and reason, then decide.</p>
            <button disabled={busy} onClick={() => run(() => sb.rpc("admin_review_return", { p_return: ret.id, p_approve: true }), "Approved. The customer was told.")} className={`${btn} bg-ok text-white`}>Approve return</button>
            <button disabled={busy} onClick={reject} className={`${btn} border border-margin/40 text-margin`}>Reject</button>
          </>
        )}

        {(s === "approved" || s === "pickup_assigned") && !isPickupOrder && (
          agents.length ? (
            <div>
              <label htmlFor="ragent" className="font-semibold">{s === "approved" ? "Send a partner to collect" : "Pickup partner"}</label>
              <select id="ragent" value={agent} onChange={(e) => setAgent(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-paper px-2">
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name ?? "Agent"}{a.agent_online ? " (online)" : ""}</option>)}
              </select>
              <button disabled={busy || !agent} onClick={() => run(() => sb.rpc("admin_assign_return_agent", { p_return: ret.id, p_agent: agent }), "Partner assigned.")} className={`${btn} mt-2 bg-ink text-white`}>
                {s === "approved" ? "Assign pickup" : "Change partner"}
              </button>
            </div>
          ) : <p className="text-muted">No delivery agents yet. Add one in Users and roles, or receive the items at the counter.</p>
        )}
        {s === "pickup_assigned" && <p className="rounded-lg bg-ink-soft px-3 py-2">Waiting for the partner to collect the items.</p>}

        {(s === "approved" || s === "pickup_assigned" || s === "picked_up") && (
          <div className="border-t border-dashed border-line pt-3">
            <p className="font-semibold">{s === "picked_up" ? "Items on their way to the store" : isPickupOrder ? "Customer brings the items to the store" : "Or the customer drops them at the store"}</p>
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="size-4 accent-[var(--ink)]" /> Put back in stock (can be sold again)
            </label>
            <button disabled={busy} onClick={() => run(() => sb.rpc("admin_receive_return", { p_return: ret.id, p_restock: restock }), "Marked received. Now send the refund.")} className={`${btn} mt-2 bg-ink text-white`}>Items received at store</button>
          </div>
        )}

        {s === "received" && (
          <RefundProofForm customerId={ret.user_id} amountPaise={ret.refund_amount_paise} upiId={ret.refund_upi_id}
            submit={(path, utr) => sb.rpc("admin_refund_return", { p_return: ret.id, p_proof_path: path, p_utr: utr })} />
        )}
        {(s === "refunded" || s === "rejected") && <p className="text-muted">Nothing more to do.</p>}
        {msg && <p className={`font-semibold ${msg.ok ? "text-ok" : "text-margin"}`} role="status">{msg.text}</p>}
      </div>
    </section>
  );
}
