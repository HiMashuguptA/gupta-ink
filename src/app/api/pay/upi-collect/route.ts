import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/server";
import { cashfreeReady, createUpiCollect } from "@/lib/cashfree";
import { rpc } from "@/lib/admin-db";
import { allow, clientIp, tooMany } from "@/lib/rate-limit";

const UPI_ID = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,63}$/i;

/** Customer enters their UPI ID; Cashfree sends a payment request to their UPI app. */
export async function POST(req: Request) {
  if (!allow(`upi-collect:${clientIp(req)}`, 5, 300)) return tooMany();
  if (!cashfreeReady()) return NextResponse.json({ error: "UPI requests are not switched on yet" }, { status: 503 });
  const me = await getSessionProfile();
  if (!me.user || !me.profile) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { order?: string; upi?: string };
  const upi = (body.upi ?? "").trim().toLowerCase();
  if (!UPI_ID.test(upi)) return NextResponse.json({ error: "That doesn't look like a UPI ID (like name@okaxis)" }, { status: 400 });

  // Row-level security makes sure this is the signed-in customer's own order
  const { data: o } = await me.supabase.from("orders")
    .select("id, order_no, payable_paise, payment_method, payment_status, status, address")
    .eq("id", body.order ?? "").maybeSingle();
  if (!o || o.payment_method !== "upi" || o.payment_status === "paid" || o.status !== "placed") {
    return NextResponse.json({ error: "This order isn't waiting for a UPI payment" }, { status: 409 });
  }
  const addr = o.address as { contact_phone?: string } | null;
  const phone = (me.profile.phone ?? addr?.contact_phone ?? "").replace(/\D/g, "").slice(-10);
  if (phone.length !== 10) return NextResponse.json({ error: "Add your mobile number in your account first" }, { status: 400 });

  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const cfo = await createUpiCollect({
      id: o.id, order_no: o.order_no, amount_paise: o.payable_paise, customer_id: me.user.id, phone,
      email: me.profile.email, name: me.profile.name, upi_id: upi, return_url: `${site}/orders/${o.id}`,
    });
    await rpc("_gateway_started", { p_order: o.id, p_ref: cfo.order_id, p_upi: upi });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't send the request" }, { status: 502 });
  }
}
