import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { getSettings } from "@/lib/catalog";
import { rupees } from "@/lib/format";
import { when, type OrderItem, type OrderRow } from "@/lib/orders";
import { LogoMark } from "@/components/brand/Logo";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Bill", robots: { index: false } };

const PAY: Record<OrderRow["payment_method"], string> = { upi: "UPI", cod: "Cash on delivery", counter: "Pay at store counter" };
const PAY_STATUS: Record<OrderRow["payment_status"], string> = {
  pending: "Not paid yet", paid: "Paid", failed: "Payment failed", refunded: "Refunded", partially_refunded: "Partly refunded",
};
const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Itemised order bill. Same data the order page uses; the shopper (or an admin) can
 * print it or save it as a PDF. It is an order receipt, not a GST tax invoice.
 */
export default async function BillPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ supabase, user, profile }, settings] = await Promise.all([getSessionProfile(), getSettings()]);
  if (!user) redirect(`/login?next=/bill/${id}`);
  // Row-level security limits this to the shopper's own orders (admins see all)
  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("id, product_id, name, variant_label, image_url, price_paise, mrp_paise, qty").eq("order_id", id),
  ]);
  if (!order) notFound();
  const o = order as unknown as OrderRow;
  const lines = (items ?? []) as OrderItem[];
  const { data: buyer } = await supabase.from("profiles").select("name, email, phone").eq("id", o.user_id).maybeSingle();

  const mrpTotal = lines.reduce((s, l) => s + Math.max(l.mrp_paise, l.price_paise) * l.qty, 0);
  const mrpSaving = mrpTotal - o.items_total_paise;
  const coinsOff = o.coins_used * 100;
  const totalSaving = mrpSaving + o.coupon_discount_paise + coinsOff;
  const store = settings?.store_name ?? "Gupta Enterprises";
  const back = sp.from === "admin" || (profile?.role === "admin" && profile.id !== o.user_id) ? `/admin/orders/${id}` : `/orders/${id}`;

  return (
    <main className="min-h-dvh bg-paper px-3 py-4 sm:px-6 sm:py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={back} className="inline-flex items-center gap-1 text-sm font-semibold text-ink"><ChevronLeft className="size-4" /> Back to order</Link>
        <PrintButton />
      </div>
      <p className="mx-auto mb-3 max-w-3xl text-xs text-muted print:hidden">Tip: in the print window, choose &ldquo;Save as PDF&rdquo; to download the bill.</p>

      <article className="bill mx-auto max-w-3xl rounded-[14px] bg-white p-5 text-[#13201a] shadow-sm sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#0b5a45] pb-4">
          <div className="flex items-center gap-3">
            <LogoMark size={48} />
            <div>
              <p className="sign-type text-[28px] text-[#0a3329]">{store}</p>
              <p className="max-w-xs text-xs leading-snug text-[#536259]">{settings?.store_address ?? "Khedi Market, New NST, opposite Hotel Galaxy, Kohima, Nagaland 797001"}</p>
              <p className="text-xs text-[#536259]">Phone {settings?.store_phone ?? "7905529544"}{settings?.support_email ? ` · ${settings.support_email}` : ""}</p>
            </div>
          </div>
          <div className="w-full sm:w-auto sm:text-right">
            <p className="sign-type text-[26px] text-[#0b5a45]">Order bill</p>
            <p className="text-sm font-semibold">#{o.order_no}</p>
            <p className="text-xs text-[#536259]">{fmt(o.created_at)}</p>
          </div>
        </header>

        <section className="grid gap-4 border-b border-[#dbe3dd] py-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#536259]">Billed to</p>
            <p className="mt-1 font-semibold">{buyer?.name ?? o.address?.contact_name ?? o.pickup_contact?.name ?? "Customer"}</p>
            {buyer?.phone && <p>+91 {buyer.phone}</p>}
            {buyer?.email && <p className="break-all text-[#536259]">{buyer.email}</p>}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#536259]">{o.type === "pickup" ? "Store pickup" : "Deliver to"}</p>
            {o.address ? (
              <>
                <p className="mt-1 font-semibold">{o.address.contact_name}, +91 {o.address.contact_phone}</p>
                <p>{o.address.house_name}, {o.address.road}{o.address.landmark ? `, near ${o.address.landmark}` : ""}</p>
                <p className="text-[#536259]">{when(o)}{o.road_km ? ` · ${Number(o.road_km).toFixed(1)} km` : ""}</p>
              </>
            ) : (
              <>
                {o.pickup_contact ? <p className="mt-1 font-semibold">Collected by {o.pickup_contact.name}, +91 {o.pickup_contact.phone}</p> : <p className="mt-1 font-semibold">Collect at the store counter</p>}
                <p className="text-[#536259]">At {store}, Khedi Market, Kohima</p>
              </>
            )}
          </div>
        </section>

        {/* Phones: one line per item; wider screens and print: the full table */}
        <ul className="mt-3 divide-y divide-[#e8eee9] text-sm sm:hidden print:hidden">
          {lines.map((l, i) => (
            <li key={l.id} className="flex gap-3 py-2.5">
              <span className="w-4 shrink-0 text-[#536259]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.name}</p>
                <p className="text-xs text-[#536259]">
                  {l.variant_label ? `${l.variant_label} · ` : ""}{l.qty} × {rupees(l.price_paise)}
                  {l.mrp_paise > l.price_paise && <> (MRP <s>{rupees(l.mrp_paise)}</s>)</>}
                </p>
              </div>
              <p className="shrink-0 font-semibold">{rupees(l.price_paise * l.qty)}</p>
            </li>
          ))}
        </ul>
        <div className="hidden sm:block print:block">
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#dbe3dd] text-left text-xs uppercase tracking-wider text-[#536259]">
                <th className="py-2 pr-2 font-bold">#</th>
                <th className="py-2 pr-2 font-bold">Item</th>
                <th className="py-2 pr-2 text-right font-bold">MRP</th>
                <th className="py-2 pr-2 text-right font-bold">Price</th>
                <th className="py-2 pr-2 text-right font-bold">Qty</th>
                <th className="py-2 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id} className="border-b border-[#e8eee9] align-top">
                  <td className="py-2 pr-2 text-[#536259]">{i + 1}</td>
                  <td className="py-2 pr-2"><p className="font-semibold">{l.name}</p>{l.variant_label && <p className="text-xs text-[#536259]">{l.variant_label}</p>}</td>
                  <td className="py-2 pr-2 text-right text-[#536259]">{l.mrp_paise > l.price_paise ? <s>{rupees(l.mrp_paise)}</s> : rupees(l.mrp_paise || l.price_paise)}</td>
                  <td className="py-2 pr-2 text-right">{rupees(l.price_paise)}</td>
                  <td className="py-2 pr-2 text-right">{l.qty}</td>
                  <td className="py-2 text-right font-semibold">{rupees(l.price_paise * l.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-4 flex flex-col-reverse gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-xs leading-relaxed text-[#536259] sm:max-w-[48%]">
            <p><b className="text-[#13201a]">Payment:</b> {PAY[o.payment_method]} · {PAY_STATUS[o.payment_status]}</p>
            <p><b className="text-[#13201a]">Order type:</b> {when(o)}</p>
            {o.coins_to_earn > 0 && o.status !== "cancelled" && <p><b className="text-[#13201a]">SuperCoins:</b> {o.coins_to_earn} coins credited after the return window</p>}
            {o.status === "cancelled" && <p className="mt-1 font-semibold text-[#c0392b]">This order was cancelled.{o.refund_due_paise > 0 ? ` Refund due: ${rupees(o.refund_due_paise)}.` : ""}</p>}
            {o.note && <p><b className="text-[#13201a]">Note:</b> {o.note}</p>}
          </div>
          <dl className="w-full space-y-1.5 text-sm sm:w-72">
            <div className="flex justify-between"><dt className="text-[#536259]">Total MRP</dt><dd>{rupees(mrpTotal)}</dd></div>
            {mrpSaving > 0 && <div className="flex justify-between text-[#1d8a4b]"><dt>Discount on MRP</dt><dd>−{rupees(mrpSaving)}</dd></div>}
            <div className="flex justify-between"><dt className="text-[#536259]">Item total</dt><dd>{rupees(o.items_total_paise)}</dd></div>
            {o.coupon_discount_paise > 0 && <div className="flex justify-between text-[#1d8a4b]"><dt>Coupon {o.coupon_code}</dt><dd>−{rupees(o.coupon_discount_paise)}</dd></div>}
            {coinsOff > 0 && <div className="flex justify-between text-[#1d8a4b]"><dt>SuperCoins ({o.coins_used})</dt><dd>−{rupees(coinsOff)}</dd></div>}
            <div className="flex justify-between"><dt className="text-[#536259]">{o.type === "pickup" ? "Pickup" : "Delivery fee"}</dt><dd>{o.delivery_fee_paise ? rupees(o.delivery_fee_paise) : "Free"}</dd></div>
            {o.fine_paise > 0 && <div className="flex justify-between"><dt className="text-[#536259]">Earlier cancellation fine</dt><dd>{rupees(o.fine_paise)}</dd></div>}
            <div className="flex justify-between border-t-2 border-[#0b5a45] pt-2 text-base font-extrabold"><dt>Amount payable</dt><dd>{rupees(o.payable_paise)}</dd></div>
            {totalSaving > 0 && <p className="text-right text-xs font-semibold text-[#1d8a4b]">You saved {rupees(totalSaving)} on this order</p>}
          </dl>
        </section>

        <footer className="mt-6 border-t border-dashed border-[#cfdbd3] pt-4 text-xs leading-relaxed text-[#536259]">
          <p>Prices include all applicable taxes. <b className="text-[#13201a]">This is an order bill, not a GST tax invoice.</b> Need a GST invoice? Contact the store on {settings?.store_phone ?? "7905529544"}{settings?.support_email ? ` or ${settings.support_email}` : ""} with order #{o.order_no} and your GSTIN.</p>
          <p className="mt-1">Returns and refunds follow our policies at {(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, "") || "our website"}/policies. Thank you for shopping with {store}.</p>
        </footer>
      </article>
    </main>
  );
}
