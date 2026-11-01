"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Clock, CheckCircle2, AtSign, Loader2, ChevronDown, Smartphone } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { Sheet } from "@/components/ui/Sheet";
import { rupees } from "@/lib/format";
import type { OrderRow } from "@/lib/orders";

type Upi = { vpa: string; name: string; collect?: boolean };

/** UPI apps people use most in India. Android opens the app by package; iPhone by its link scheme. */
const APPS = [
  { id: "gpay", name: "Google Pay", pkg: "com.google.android.apps.nbu.paisa.user", ios: "gpay://upi/pay", bg: "#ffffff", fg: "#1a73e8", mark: "G" },
  { id: "phonepe", name: "PhonePe", pkg: "com.phonepe.app", ios: "phonepe://pay", bg: "#5f259f", fg: "#ffffff", mark: "पे" },
  { id: "paytm", name: "Paytm", pkg: "net.one97.paytm", ios: "paytmmp://pay", bg: "#00baf2", fg: "#ffffff", mark: "P" },
  { id: "bhim", name: "BHIM", pkg: "in.org.npci.upiapp", ios: "bhim://pay", bg: "#ffffff", fg: "#ee7623", mark: "B" },
];

function platform() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}

/**
 * Pay the store by UPI. A pop-up lists the UPI apps (amount filled in), shows a QR on computers,
 * and, when Cashfree is switched on, lets the customer type their UPI ID and approve a request in their app.
 * Paying through Cashfree confirms the order on its own and emails the customer; paying the store's
 * UPI ID directly still asks for the 12-digit reference so the store can match it.
 */
export function UpiPayPanel({ order, upi, utr, onSubmitted }: { order: OrderRow; upi: Upi; utr: string | null; onSubmitted: (u: string) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [os, setOs] = useState<"android" | "ios" | "desktop">("desktop");
  const [qr, setQr] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [vpa, setVpa] = useState("");
  const [busy, setBusy] = useState<"" | "utr" | "collect">("");
  const [requested, setRequested] = useState<string | null>(null);
  const [showUtr, setShowUtr] = useState(!upi.collect);
  const [left, setLeft] = useState(0);
  const amount = (order.payable_paise / 100).toFixed(2);
  const query = `pa=${encodeURIComponent(upi.vpa)}&pn=${encodeURIComponent(upi.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(order.order_no)}`;
  const link = `upi://pay?${query}`;

  useEffect(() => setOs(platform()), []);
  useEffect(() => {
    void QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: "#0a3329", light: "#ffffff" } }).then(setQr);
  }, [link]);
  useEffect(() => {
    const end = new Date(order.created_at).getTime() + 30 * 60 * 1000;
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [order.created_at]);

  const appHref = (a: (typeof APPS)[number]) =>
    os === "android" ? `intent://pay?${query}#Intent;scheme=upi;package=${a.pkg};end` : `${a.ios}?${query}`;

  const submitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("utr");
    const { error } = await supabaseBrowser().rpc("submit_upi_utr", { p_order: order.id, p_utr: ref });
    setBusy("");
    if (error) return toast({ kind: "error", title: "Couldn't submit the reference", body: error.message });
    onSubmitted(ref.replace(/\s/g, ""));
    setOpen(false);
    toast({ kind: "ok", title: "Thanks! We're checking your payment", body: "Your order is confirmed as soon as the store sees it." });
  };

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("collect");
    try {
      const r = await fetch("/api/pay/upi-collect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: order.id, upi: vpa }) });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || "Couldn't send the request");
      setRequested(vpa.trim().toLowerCase());
      setOpen(false);
    } catch (err) {
      toast({ kind: "error", title: "Request not sent", body: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy("");
    }
  };

  if (utr) {
    return (
      <div className="flex gap-3 rounded-[12px] border border-ok/30 bg-ok/5 p-4">
        <CheckCircle2 className="size-6 shrink-0 text-ok" />
        <div className="text-sm">
          <p className="font-bold">We&apos;re checking your payment</p>
          <p className="text-muted">Reference {utr}. Your order is confirmed as soon as the store matches it, usually within a few minutes.</p>
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  const field = "h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-card px-3 font-semibold outline-none focus:border-ink";

  return (
    <section className="rounded-[12px] border-[1.5px] border-nib bg-nib-soft/50 p-4" aria-label="Pay by UPI">
      <div className="flex items-center justify-between">
        <p className="font-bold">Pay {rupees(order.payable_paise)} by UPI</p>
        <p className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-ink-deep" aria-live="off"><Clock className="size-4" /> {mm}:{ss}</p>
      </div>
      <p className="mt-0.5 text-sm text-muted">Pay within 30 minutes or the order is cancelled automatically.</p>
      {requested ? (
        <div className="mt-3 flex gap-3 rounded-[10px] bg-card p-3 text-sm">
          <Loader2 className="size-5 shrink-0 animate-spin text-nib" />
          <div>
            <p className="font-bold">Approve the request in your UPI app</p>
            <p className="text-muted">We sent {rupees(order.payable_paise)} to <b className="text-graphite">{requested}</b>. Open your UPI app, check pending requests and enter your PIN. This page updates on its own and we email you a receipt.</p>
            <button onClick={() => setRequested(null)} className="mt-1 text-xs font-semibold underline">Use a different UPI ID</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-ink font-semibold text-on-ink">
          <Smartphone className="size-5" /> Pay {rupees(order.payable_paise)} now
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Pay with UPI">
        <p className="-mt-1 mb-3 text-sm text-muted">{rupees(order.payable_paise)} to {upi.name} · Order {order.order_no}</p>

        {os === "desktop" ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr && <img src={qr} alt={`UPI QR code to pay ${rupees(order.payable_paise)} to ${upi.name}`} className="size-40 shrink-0 rounded-[10px] border border-line bg-white p-1" />}
            <p className="text-sm">Scan with any UPI app on your phone. The amount and note are filled in. Or pay to <b className="select-all">{upi.vpa}</b>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {APPS.map((a) => (
              <a key={a.id} href={appHref(a)} className="press flex flex-col items-center gap-1.5 rounded-[12px] p-2 text-center text-xs font-semibold hover:bg-sunk active:bg-sunk">
                <span className="grid size-12 place-items-center rounded-[14px] border border-line text-lg font-black shadow-sm" style={{ background: a.bg, color: a.fg }} aria-hidden>{a.mark}</span>
                {a.name}
              </a>
            ))}
            <a href={link} className="press col-span-4 mt-1 flex h-11 items-center justify-center rounded-[10px] bg-sunk text-sm font-semibold hover:bg-ink-soft">Other UPI app</a>
          </div>
        )}

        {upi.collect && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase text-muted"><span className="h-px flex-1 bg-line" /> or get a request <span className="h-px flex-1 bg-line" /></div>
            <form onSubmit={sendRequest}>
              <label htmlFor="vpa" className="text-sm font-semibold">Your UPI ID</label>
              <div className="mt-1.5 flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <input id="vpa" value={vpa} onChange={(e) => setVpa(e.target.value.replace(/\s/g, "").slice(0, 80))} autoComplete="off" autoCapitalize="none" spellCheck={false}
                    placeholder="name@okaxis" className={`${field} w-full pl-9`} />
                </div>
                <button disabled={busy === "collect" || !/^[\w.-]{2,}@[a-z][\w.-]+$/i.test(vpa)} className="press h-11 shrink-0 rounded-[10px] bg-nib px-4 text-sm font-bold text-on-nib disabled:opacity-40">
                  {busy === "collect" ? "Sending…" : "Send request"}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">You approve it in your UPI app. Your order is confirmed automatically and we email you a receipt.</p>
            </form>
          </>
        )}

        <div className="mt-4 border-t border-line pt-3">
          {upi.collect && (
            <button type="button" onClick={() => setShowUtr((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold" aria-expanded={showUtr}>
              Already paid? Enter the reference <ChevronDown className={`size-4 transition-transform ${showUtr ? "rotate-180" : ""}`} />
            </button>
          )}
          {showUtr && (
            <form onSubmit={submitUtr} className={upi.collect ? "mt-2" : ""}>
              <label htmlFor="utr" className="text-sm font-semibold">After paying, enter the 12-digit UPI reference (UTR)</label>
              <div className="mt-1.5 flex gap-2">
                <input id="utr" value={ref} onChange={(e) => setRef(e.target.value.replace(/[^\d ]/g, "").slice(0, 15))} inputMode="numeric" placeholder="e.g. 412345678901"
                  className={`${field} tracking-wider`} />
                <button disabled={busy === "utr" || ref.replace(/\s/g, "").length !== 12} className="press h-11 shrink-0 rounded-[10px] bg-ink px-4 text-sm font-bold text-on-ink disabled:opacity-40">{busy === "utr" ? "Sending…" : "Submit"}</button>
              </div>
              <p className="mt-1 text-xs text-muted">Find it in your payment app under the transaction details.</p>
            </form>
          )}
        </div>
      </Sheet>
    </section>
  );
}
