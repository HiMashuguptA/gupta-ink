import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Phone, Mail, ReceiptText } from "lucide-react";
import clsx from "clsx";
import { getSessionProfile } from "@/lib/supabase/server";
import { productLinks } from "@/lib/catalog";
import { rupees } from "@/lib/format";
import { STATUS_LABEL, statusTone, when, type OrderRow } from "@/lib/orders";
import { AdminOrderActions } from "./AdminOrderActions";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await getSessionProfile();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!order) notFound();
  const o = order as unknown as OrderRow;
  const [items, events, payment, customer, agents] = await Promise.all([
    supabase.from("order_items").select("id, product_id, name, variant_label, image_url, price_paise, qty, hsn, gst_rate").eq("order_id", id),
    supabase.from("order_events").select("id, status, note, created_at").eq("order_id", id).order("created_at"),
    supabase.from("payments").select("utr, status, method, amount_paise").eq("order_id", id).maybeSingle(),
    supabase.from("profiles").select("name, email, phone").eq("id", o.user_id).single(),
    supabase.from("profiles").select("id, name, phone, agent_online").eq("role", "delivery_agent").order("name"),
  ]);
  const links = await productLinks((items.data ?? []).map((i) => i.product_id));

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/orders" className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label="All orders"><ChevronLeft className="size-5" /></Link>
        <h1 className="text-[34px] uppercase">{o.order_no}</h1>
        <span className={clsx("rounded-full px-3 py-1 text-xs font-bold", statusTone(o.status))}>{STATUS_LABEL[o.status]}</span>
        <span className="text-sm text-muted">{new Date(o.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</span>
        <Link href={`/bill/${o.id}?from=admin`} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-ink px-3 text-sm font-semibold text-ink"><ReceiptText className="size-4" /> Bill</Link>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-[12px] bg-card">
            <ul className="divide-y divide-line">
              {(items.data ?? []).map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image_url ?? "/brand/logo.svg"} alt="" className="size-12 rounded-[8px]" />
                  <div className="min-w-0 flex-1 text-sm"><p className="font-semibold">{links[it.product_id] ? <Link href={links[it.product_id]} target="_blank" className="text-ink hover:underline">{it.name}</Link> : it.name}</p><p className="text-muted">{it.variant_label} × <b className="text-graphite">{it.qty}</b></p></div>
                  <p className="text-sm font-semibold">{rupees(it.price_paise * it.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Items</dt><dd>{rupees(o.items_total_paise)}</dd></div>
              {o.coupon_discount_paise > 0 && <div className="flex justify-between"><dt className="text-muted">Coupon {o.coupon_code}</dt><dd>−{rupees(o.coupon_discount_paise)}</dd></div>}
              {o.coins_used > 0 && <div className="flex justify-between"><dt className="text-muted">SuperCoins</dt><dd>−{rupees(o.coins_used * 100)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Delivery fee</dt><dd>{rupees(o.delivery_fee_paise)}</dd></div>
              {o.fine_paise > 0 && <div className="flex justify-between"><dt className="text-muted">Cancellation fine collected</dt><dd>{rupees(o.fine_paise)}</dd></div>}
              <div className="flex justify-between border-t border-dashed border-line pt-2 font-extrabold"><dt>{o.payment_method === "cod" ? "Collect in cash" : o.payment_method === "counter" ? "Collect at counter" : "Paid by UPI"}</dt><dd>{rupees(o.payable_paise)}</dd></div>
            </dl>
          </section>

          {o.note && <section className="rounded-[12px] border border-nib/40 bg-nib-soft p-4 text-sm"><p className="font-bold">Customer note</p><p>{o.note}</p></section>}

          <section className="rounded-[12px] bg-card p-4">
            <h2 className="font-bold">History</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {(events.data ?? []).map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-20 shrink-0 text-muted">{new Date(e.created_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}</span>
                  <span><b>{STATUS_LABEL[e.status as keyof typeof STATUS_LABEL] ?? e.status.replace(/_/g, " ")}</b>{e.note ? `: ${e.note}` : ""}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-5">
          <AdminOrderActions order={o} utr={payment.data?.utr ?? null} agents={(agents.data ?? []) as { id: string; name: string | null; phone: string | null; agent_online: boolean }[]} />

          <section className="rounded-[12px] bg-card p-4 text-sm">
            <h2 className="font-bold">Customer</h2>
            <p className="mt-2 font-semibold">{customer.data?.name ?? "Customer"}</p>
            {customer.data?.phone && <a href={`tel:+91${customer.data.phone}`} className="mt-1 flex items-center gap-2 text-ink"><Phone className="size-4" /> {customer.data.phone}</a>}
            {customer.data?.email && <a href={`mailto:${customer.data.email}`} className="mt-1 flex items-center gap-2 text-ink"><Mail className="size-4" /> {customer.data.email}</a>}
          </section>

          <section className="rounded-[12px] bg-card p-4 text-sm">
            <h2 className="font-bold">{o.type === "pickup" ? "Store pickup" : "Deliver to"}</h2>
            <p className="mt-1 text-muted">{when(o)}</p>
            {o.type === "pickup" && (
              o.pickup_contact ? (
                <>
                  <p className="mt-2 font-semibold">Collected by {o.pickup_contact.name}</p>
                  <a href={`tel:+91${o.pickup_contact.phone}`} className="flex items-center gap-2 text-ink"><Phone className="size-4" /> {o.pickup_contact.phone}</a>
                </>
              ) : <p className="mt-2 text-muted">No pickup contact given (older order). Use the customer details above.</p>
            )}
            {o.address && (
              <>
                <p className="mt-2 font-semibold">{o.address.contact_name}{o.address.for_someone_else ? " (ordered by someone else)" : ""}</p>
                <a href={`tel:+91${o.address.contact_phone}`} className="flex items-center gap-2 text-ink"><Phone className="size-4" /> {o.address.contact_phone}</a>
                <p className="mt-1">{o.address.house_name}, {o.address.road}{o.address.landmark ? `, near ${o.address.landmark}` : ""}</p>
                {o.road_km != null && <p className="text-muted">{Number(o.road_km).toFixed(1)} km by road</p>}
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.address.lat},${o.address.lng}`} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-[8px] border border-line px-3 py-1.5 font-semibold"><MapPin className="size-4" /> Open in Maps</a>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
