"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone, Clock, CheckCircle2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { rupees } from "@/lib/format";
import type { OrderRow } from "@/lib/orders";

/**
 * Pay the store's UPI ID directly (app link on phones, QR on computers), then
 * enter the 12-digit UPI reference so the store can match the payment.
 * When the YouPI gateway is set up on the store PC, this is replaced by automatic confirmation.
 */
export function UpiPayPanel({ order, upi, utr, onSubmitted }: { order: OrderRow; upi: { vpa: string; name: string }; utr: string | null; onSubmitted: (u: string) => void }) {
  const toast = useToast();
  const [qr, setQr] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const amount = (order.payable_paise / 100).toFixed(2);
  const link = `upi://pay?pa=${encodeURIComponent(upi.vpa)}&pn=${encodeURIComponent(upi.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(order.order_no)}`;

  useEffect(() => {
    void QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: "#141c4d", light: "#ffffff" } }).then(setQr);
  }, [link]);

  useEffect(() => {
    const end = new Date(order.created_at).getTime() + 30 * 60 * 1000;
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [order.created_at]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabaseBrowser().rpc("submit_upi_utr", { p_order: order.id, p_utr: ref });
    setBusy(false);
    if (error) return toast({ kind: "error", title: "Couldn't submit the reference", body: error.message });
    onSubmitted(ref.replace(/\s/g, ""));
    toast({ kind: "ok", title: "Thanks! We're checking your payment", body: "Your order is confirmed as soon as the store sees it." });
  };

  if (utr) {
    return (
      <div className="flex gap-3 rounded-2xl border border-ok/30 bg-ok/5 p-4">
        <CheckCircle2 className="size-6 shrink-0 text-ok" />
        <div className="text-sm">
          <p className="font-bold">We&apos;re checking your payment</p>
          <p className="text-muted">Reference {utr}. Your order is confirmed as soon as the store matches it, usually within a few minutes.</p>
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <section className="rounded-2xl border-[1.5px] border-nib bg-nib-soft/50 p-4" aria-label="Pay by UPI">
      <div className="flex items-center justify-between">
        <p className="font-bold">Pay {rupees(order.payable_paise)} by UPI</p>
        <p className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-ink-deep" aria-live="off"><Clock className="size-4" /> {mm}:{ss}</p>
      </div>
      <p className="mt-0.5 text-sm text-muted">Pay within 30 minutes or the order is cancelled automatically.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt={`UPI QR code to pay ${rupees(order.payable_paise)} to ${upi.name}`} className="mx-auto size-44 rounded-xl border border-line bg-white p-1 sm:mx-0" />}
        <div className="space-y-2 text-sm">
          <a href={link} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-white sm:hidden"><Smartphone className="size-5" /> Open UPI app</a>
          <p className="hidden sm:block">Scan with any UPI app, or pay to <b className="select-all">{upi.vpa}</b>. Add <b>{order.order_no}</b> as the note.</p>
          <p className="sm:hidden text-center text-muted">or pay to <b className="select-all text-graphite">{upi.vpa}</b></p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-4">
        <label htmlFor="utr" className="text-sm font-semibold">After paying, enter the 12-digit UPI reference (UTR)</label>
        <div className="mt-1.5 flex gap-2">
          <input id="utr" value={ref} onChange={(e) => setRef(e.target.value.replace(/[^\d ]/g, "").slice(0, 15))} inputMode="numeric" placeholder="e.g. 412345678901"
            className="h-11 flex-1 rounded-xl border border-line bg-card px-3 font-semibold tracking-wider outline-none focus:border-ink" />
          <button disabled={busy || ref.replace(/\s/g, "").length !== 12} className="h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Sending…" : "Submit"}</button>
        </div>
        <p className="mt-1 text-xs text-muted">Find it in your payment app under the transaction details.</p>
      </form>
    </section>
  );
}
