"use client";
import { useEffect, useState } from "react";
import { Clock, Loader2, ShieldCheck, AlertTriangle, Smartphone, CreditCard, Landmark, Wallet } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { rupees } from "@/lib/format";
import { startOnlinePayment } from "@/lib/pay-client";
import type { OrderRow } from "@/lib/orders";

const HOLD_MIN = 20; // Cashfree's page stays open 20 minutes; stock is released at 25

/**
 * The order isn't placed until this is paid. One button opens Cashfree's secure page
 * (UPI, cards, netbanking, wallets); coming back confirms the order on its own.
 */
export function OnlinePayPanel({ order, failed, onCancel }: { order: OrderRow; failed: boolean; onCancel: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const end = new Date(order.created_at).getTime() + HOLD_MIN * 60 * 1000;
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [order.created_at]);

  const pay = async () => {
    setBusy(true);
    try {
      await startOnlinePayment(order.id); // leaves the page on success
    } catch (e) {
      setBusy(false);
      toast({ kind: "error", title: "Payment didn't start", body: e instanceof Error ? e.message : undefined });
    }
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  const expired = left === 0;

  return (
    <section className="overflow-hidden rounded-[14px] border-[1.5px] border-nib bg-nib-soft/50" aria-label="Payment">
      {failed && (
        <div className="flex gap-2.5 bg-margin/10 px-4 py-3 text-sm text-margin">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p><b>Payment didn&apos;t go through.</b> No money was taken. You can try again or use another method.</p>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold">Pay {rupees(order.payable_paise)} to place your order</p>
            <p className="mt-0.5 text-sm text-muted">Your items are held for you. The store gets the order once it&apos;s paid.</p>
          </div>
          <p className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-2.5 py-1 text-sm font-semibold tabular-nums text-ink-deep" aria-label={`${mm} minutes ${ss} seconds left`}>
            <Clock className="size-4" /> {mm}:{ss}
          </p>
        </div>

        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-graphite" aria-label="Ways to pay">
          {[{ i: Smartphone, t: "UPI" }, { i: CreditCard, t: "Cards" }, { i: Landmark, t: "Netbanking" }, { i: Wallet, t: "Wallets" }].map(({ i: I, t }) => (
            <li key={t} className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1"><I className="size-3.5 text-ink" /> {t}</li>
          ))}
        </ul>

        <button onClick={pay} disabled={busy || expired}
          className="press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-ink font-semibold text-on-ink disabled:opacity-60">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
          {expired ? "Time ran out" : busy ? "Opening secure payment…" : failed ? `Try again: pay ${rupees(order.payable_paise)}` : `Pay ${rupees(order.payable_paise)} securely`}
        </button>
        <p className="mt-1.5 text-center text-xs text-muted">Secured by Cashfree. If money leaves your account but the order doesn&apos;t confirm, it&apos;s refunded automatically.</p>
        <button onClick={onCancel} className="mt-2 w-full text-center text-sm font-semibold text-muted underline underline-offset-2 hover:text-graphite">
          Don&apos;t want it? Cancel (no charge)
        </button>
      </div>
    </section>
  );
}
