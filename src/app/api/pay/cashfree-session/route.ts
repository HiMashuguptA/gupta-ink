import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/server";
import { cashfreeMode, cashfreeReady, createCheckout } from "@/lib/cashfree";
import { rpc } from "@/lib/admin-db";
import { allow, clientIp, tooMany } from "@/lib/rate-limit";

/** Starts Cashfree's checkout for the signed-in customer's own unpaid order. */
export async function POST(req: Request) {
  if (!allow(`cf-session:${clientIp(req)}`, 10, 300)) return tooMany();
  if (!cashfreeReady()) return NextResponse.json({ error: "Online payment is not switched on yet" }, { status: 503 });
  const me = await getSessionProfile();
  if (!me.user || !me.profile) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { order?: string };

  // Row-level security makes sure this is the signed-in customer's own order
  const { data: o } = await me.supabase.from("orders")
    .select("id, order_no, payable_paise, payment_method, payment_status, status, address")
    .eq("id", body.order ?? "").maybeSingle();
  if (!o || o.payment_method !== "upi" || o.payment_status === "paid" || o.status !== "placed") {
    return NextResponse.json({ error: "This order isn't waiting for a payment" }, { status: 409 });
  }
  const addr = o.address as { contact_phone?: string } | null;
  const phone = (me.profile.phone ?? addr?.contact_phone ?? "").replace(/\D/g, "").slice(-10);
  if (phone.length !== 10) return NextResponse.json({ error: "Add your mobile number in your account first" }, { status: 400 });

  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const cfo = await createCheckout({
      id: o.id, order_no: o.order_no, amount_paise: o.payable_paise, customer_id: me.user.id, phone,
      email: me.profile.email, name: me.profile.name, return_url: `${site}/orders/${o.id}?cf={order_id}`,
    });
    await rpc("_gateway_started", { p_order: o.id, p_ref: cfo.order_id, p_upi: "checkout" });
    return NextResponse.json({ session: cfo.payment_session_id, mode: cashfreeMode() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't start the payment" }, { status: 502 });
  }
}
