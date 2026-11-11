"use client";

type CashfreeSdk = (o: { mode: string }) => { checkout: (o: { paymentSessionId: string; redirectTarget: string }) => Promise<{ error?: { message?: string } } | void> };

/** Cashfree's checkout script, loaded only when someone is about to pay. */
function loadCashfree(): Promise<CashfreeSdk> {
  const w = window as unknown as { Cashfree?: CashfreeSdk };
  if (w.Cashfree) return Promise.resolve(w.Cashfree);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.async = true;
    s.onload = () => (w.Cashfree ? resolve(w.Cashfree) : reject(new Error("The payment page didn't load")));
    s.onerror = () => reject(new Error("The payment page didn't load. Check your internet and try again."));
    document.head.appendChild(s);
  });
}

/**
 * Opens Cashfree's secure payment page for one of the shopper's unpaid orders (UPI, cards,
 * netbanking, wallets). The browser leaves the shop and comes back to /orders/<id>?cf=<cashfree id>.
 */
export async function startOnlinePayment(orderId: string) {
  const [r, Cashfree] = await Promise.all([
    fetch("/api/pay/cashfree-session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: orderId }) }),
    loadCashfree(),
  ]);
  const j = (await r.json().catch(() => ({}))) as { session?: string; mode?: string; error?: string };
  if (!r.ok || !j.session) throw new Error(j.error || "Couldn't start the payment");
  const res = await Cashfree({ mode: j.mode ?? "production" }).checkout({ paymentSessionId: j.session, redirectTarget: "_self" });
  if (res && res.error) throw new Error(res.error.message || "Payment didn't start");
}

/** After coming back: ask the shop to check with Cashfree. */
export async function verifyOnlinePayment(orderId: string, cfOrderId: string): Promise<{ paid: boolean; status?: string }> {
  const r = await fetch("/api/pay/cashfree-verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: orderId, cf: cfOrderId }) });
  return (await r.json().catch(() => ({ paid: false }))) as { paid: boolean; status?: string };
}
