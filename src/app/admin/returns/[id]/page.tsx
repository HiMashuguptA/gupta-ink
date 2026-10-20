import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, Phone, Mail, MapPin } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { rupees } from "@/lib/format";
import { RETURN_LABEL, returnTone, type ReturnRow } from "@/lib/returns";
import { ReturnActions } from "./ReturnActions";

export const metadata = { title: "Return" };

export default async function AdminReturn({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("returns").select("*").eq("id", id).single();
  if (!data) notFound();
  const r = data as unknown as ReturnRow;
  const [order, customer, agents, photos, proof] = await Promise.all([
    supabase.from("orders").select("id, order_no, type, payable_paise, payment_method, delivered_at").eq("id", r.order_id).single(),
    supabase.from("profiles").select("name, email, phone").eq("id", r.user_id).single(),
    supabase.from("profiles").select("id, name, agent_online").eq("role", "delivery_agent").order("name"),
    r.photos.length ? supabase.storage.from("returns").createSignedUrls(r.photos, 3600) : Promise.resolve({ data: [] as { signedUrl: string }[] }),
    r.refund_proof_path ? supabase.storage.from("refund-proofs").createSignedUrl(r.refund_proof_path, 3600) : Promise.resolve({ data: null }),
  ]);
  const a = r.pickup_address;
  const o = order.data;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/returns" className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label="All returns"><ChevronLeft className="size-5" /></Link>
        <h1 className="text-2xl font-extrabold">Return on {o?.order_no}</h1>
        <span className={clsx("rounded-full px-3 py-1 text-xs font-bold", returnTone(r.status))}>{RETURN_LABEL[r.status]}</span>
        {o && <Link href={`/admin/orders/${o.id}`} className="text-sm font-semibold text-ink hover:underline">Open order</Link>}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-card">
            <ul className="divide-y divide-line">
              {r.items.map((it) => (
                <li key={it.order_item_id} className="flex items-center gap-3 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image_url ?? "/brand/logo.svg"} alt="" className="size-12 rounded-lg" />
                  <div className="min-w-0 flex-1 text-sm"><p className="font-semibold">{it.name}</p><p className="text-muted">{it.variant_label} × <b className="text-graphite">{it.qty}</b></p></div>
                  <p className="text-sm font-semibold">{rupees(it.unit_refund_paise * it.qty)}</p>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-dashed border-line p-4 text-sm font-extrabold"><span>Refund to {r.refund_upi_id}</span><span>{rupees(r.refund_amount_paise)}</span></div>
          </section>

          <section className="rounded-2xl border border-line bg-card p-4 text-sm">
            <h2 className="font-bold">Customer says</h2>
            <p className="mt-1">{r.reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(photos.data ?? []).map((p, i) => p.signedUrl && (
                <a key={i} href={p.signedUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.signedUrl} alt={`Customer photo ${i + 1}`} className="size-28 rounded-xl object-cover hover:opacity-90" />
                </a>
              ))}
            </div>
            {r.admin_note && <p className="mt-3 text-muted">Your note: {r.admin_note}</p>}
          </section>

          {r.status === "refunded" && (
            <section className="rounded-2xl border border-ok/30 bg-ok/5 p-4 text-sm">
              <p className="font-bold text-ok">Refunded {rupees(r.refund_amount_paise)}{r.refund_utr ? `, UTR ${r.refund_utr}` : ""}</p>
              {proof.data?.signedUrl && <a href={proof.data.signedUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">View screenshot</a>}
              <p className="text-muted">{r.restocked ? "Items were put back in stock." : "Items were not restocked."}</p>
            </section>
          )}
        </div>

        <div className="space-y-5">
          <ReturnActions ret={r} isPickupOrder={o?.type === "pickup"} agents={(agents.data ?? []) as { id: string; name: string | null; agent_online: boolean }[]} />
          <section className="rounded-2xl border border-line bg-card p-4 text-sm">
            <h2 className="font-bold">Customer</h2>
            <p className="mt-2 font-semibold">{customer.data?.name ?? "Customer"}</p>
            {customer.data?.phone && <a href={`tel:+91${customer.data.phone}`} className="mt-1 flex items-center gap-2 text-ink"><Phone className="size-4" /> {customer.data.phone}</a>}
            {customer.data?.email && <a href={`mailto:${customer.data.email}`} className="mt-1 flex items-center gap-2 text-ink"><Mail className="size-4" /> {customer.data.email}</a>}
            {a && o?.type !== "pickup" && (
              <>
                <p className="mt-3 font-semibold">Pickup from</p>
                <p>{a.contact_name}, {a.contact_phone}</p>
                <p className="text-muted">{a.house_name}, {a.road}{a.landmark ? `, near ${a.landmark}` : ""}</p>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 font-semibold"><MapPin className="size-4" /> Open in Maps</a>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
