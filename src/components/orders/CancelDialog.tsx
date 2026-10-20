"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { rupees } from "@/lib/format";
import type { OrderRow } from "@/lib/orders";

const REASONS = ["Ordered by mistake", "Need to change items", "Delivery time is too long", "Found it elsewhere", "Other"];

export function CancelDialog({ open, onClose, order, onCancelled }: { open: boolean; onClose: () => void; order: OrderRow; onCancelled: () => void }) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [upi, setUpi] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ free_left: number; fine_paise: number } | null>(null);
  const sb = supabaseBrowser();
  const paid = order.payment_status === "paid";

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    void sb.rpc("cancel_preview").then(({ data }) => setPreview(data as { free_left: number; fine_paise: number }));
  }, [open, sb]);

  const confirm = async () => {
    setBusy(true);
    const { data, error } = await sb.rpc("cancel_order", { p_order: order.id, p_reason: reason, p_refund_upi: paid ? upi : undefined });
    setBusy(false);
    if (error) return toast({ kind: "error", title: "Couldn't cancel", body: error.message });
    const r = data as { fine_paise: number; refund_paise: number };
    onCancelled();
    onClose();
    toast({ kind: "ok", title: `Order ${order.order_no} cancelled`,
      body: r.fine_paise > 0 ? `A ${rupees(r.fine_paise)} fine will be added to your next order.` : r.refund_paise > 0 ? `Refund of ${rupees(r.refund_paise)} on its way.` : "No charge for this cancellation." });
  };

  if (!mounted) return null;
  const fined = preview && preview.free_left === 0;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-deep/40 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="cancel-title" onClick={(e) => e.stopPropagation()}
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="w-full max-w-md rounded-t-3xl bg-card p-5 sm:rounded-3xl">
            <h2 id="cancel-title" className="text-lg font-bold">Cancel order {order.order_no}?</h2>
            {preview && (
              <p className={clsx("mt-2 rounded-xl px-3 py-2 text-sm", fined ? "bg-margin/10 text-margin" : "bg-ok/10 text-ok")}>
                {fined
                  ? `You've used your 3 free cancellations this week. Cancelling adds a ${rupees(preview.fine_paise)} fine to your next order.`
                  : `This one is free. ${preview.free_left - 1} free cancellation${preview.free_left - 1 === 1 ? "" : "s"} left this week after this.`}
              </p>
            )}
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-semibold">Why are you cancelling?</legend>
              <div className="grid gap-1.5">
                {REASONS.map((r) => (
                  <label key={r} className={clsx("flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm", reason === r ? "border-ink bg-ink-soft" : "border-line")}>
                    <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--ink)]" /> {r}
                  </label>
                ))}
              </div>
            </fieldset>
            {paid && (
              <div className="mt-4">
                <label htmlFor="refund-upi" className="text-sm font-semibold">UPI ID for your refund</label>
                <input id="refund-upi" value={upi} onChange={(e) => setUpi(e.target.value.trim())} placeholder="name@okaxis"
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:border-ink" />
                <p className="mt-1 text-xs text-muted">We refund {rupees(order.payable_paise)} within 7 working days and show the proof here.</p>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className="h-12 flex-1 rounded-xl border border-line font-semibold">Keep order</button>
              <button onClick={confirm} disabled={busy || (paid && !/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/.test(upi))} className="h-12 flex-1 rounded-xl bg-margin font-semibold text-white disabled:opacity-50">
                {busy ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
