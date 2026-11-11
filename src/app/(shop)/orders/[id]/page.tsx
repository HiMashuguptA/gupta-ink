import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { getSettings, productLinks } from "@/lib/catalog";
import { LiveRefresh } from "@/components/live/LiveRefresh";
import { OrderLive, type GatewayRefund } from "@/components/orders/OrderLive";
import type { OrderEvent, OrderItem, OrderRow } from "@/lib/orders";
import type { ReturnRow } from "@/lib/returns";
import { cashfreeReady } from "@/lib/cashfree";

export const metadata = { title: "Order", robots: { index: false, follow: true } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ supabase, user }, settings] = await Promise.all([getSessionProfile(), getSettings()]);
  if (!user) redirect(`/login?next=/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!order) notFound();
  const [items, events, payment, rets, revs, refunds] = await Promise.all([
    supabase.from("order_items").select("id, product_id, name, variant_label, image_url, price_paise, mrp_paise, qty").eq("order_id", id),
    supabase.from("order_events").select("id, status, note, created_at").eq("order_id", id).order("created_at"),
    supabase.from("payments").select("utr, status, gateway_ref").eq("order_id", id).maybeSingle(),
    supabase.from("returns").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    supabase.from("reviews").select("order_item_id, stars, comment, photos").eq("user_id", user.id),
    // Not in the generated types yet: refunds sent back through Cashfree
    (supabase.from("gateway_refunds" as never) as unknown as { select: (s: string) => { eq: (c: string, v: string) => { order: (c: string) => Promise<{ data: GatewayRefund[] | null }> } } })
      .select("id, amount_paise, status, return_id, updated_at").eq("order_id", id).order("created_at"),
  ]);
  // Refund screenshots live in a private bucket; signed links last an hour
  const sign = async (path: string | null | undefined) =>
    path ? (await supabase.storage.from("refund-proofs").createSignedUrl(path, 3600)).data?.signedUrl ?? null : null;
  const itemIds = new Set((items.data ?? []).map((i) => i.id));
  const returns = await Promise.all(((rets.data ?? []) as unknown as ReturnRow[]).map(async (r) => ({ ...r, proof_url: await sign(r.refund_proof_path) })));
  const o = order as unknown as OrderRow;
  const cancelProofUrl = await sign(o.refund_proof_path);
  const links = await productLinks((items.data ?? []).map((i) => i.product_id));
  return (
    <>
    {/* Returns, refunds, payment checks and reviews update this page by themselves */}
    <LiveRefresh at={Date.now()} id={`order-${id}`} watch={[
      { table: "orders", filter: `id=eq.${id}` }, { table: "returns", filter: `order_id=eq.${id}` },
      { table: "payments", filter: `order_id=eq.${id}` }, { table: "reviews", filter: `user_id=eq.${user.id}` },
      { table: "gateway_refunds", filter: `order_id=eq.${id}` },
    ]} />
    <OrderLive
      links={links}
      paidOnline={!!payment.data?.gateway_ref && ["success", "refunded"].includes(payment.data?.status ?? "")}
      refunds={refunds.data ?? []}
      initialOrder={o}
      items={(items.data ?? []) as OrderItem[]}
      initialEvents={(events.data ?? []) as OrderEvent[]}
      initialUtr={payment.data?.utr ?? null}
      upi={{ vpa: settings?.store_upi_id ?? "", name: settings?.store_name ?? "Gupta Enterprises", collect: cashfreeReady() }}
      storePhone={settings?.store_phone ?? "7905529544"}
      returns={returns}
      reviews={(revs.data ?? []).filter((r) => itemIds.has(r.order_item_id))}
      cancelProofUrl={cancelProofUrl}
      shop={{ lat: settings?.store_lat ?? 25.6669, lng: settings?.store_lng ?? 94.1086 }}
    />
    </>
  );
}
