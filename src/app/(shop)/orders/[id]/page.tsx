import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { getSettings } from "@/lib/catalog";
import { OrderLive } from "@/components/orders/OrderLive";
import type { OrderEvent, OrderItem, OrderRow } from "@/lib/orders";

export const metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ supabase, user }, settings] = await Promise.all([getSessionProfile(), getSettings()]);
  if (!user) redirect(`/login?next=/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!order) notFound();
  const [items, events, payment] = await Promise.all([
    supabase.from("order_items").select("id, product_id, name, variant_label, image_url, price_paise, mrp_paise, qty").eq("order_id", id),
    supabase.from("order_events").select("id, status, note, created_at").eq("order_id", id).order("created_at"),
    supabase.from("payments").select("utr, status").eq("order_id", id).maybeSingle(),
  ]);
  return (
    <OrderLive
      initialOrder={order as unknown as OrderRow}
      items={(items.data ?? []) as OrderItem[]}
      initialEvents={(events.data ?? []) as OrderEvent[]}
      initialUtr={payment.data?.utr ?? null}
      upi={{ vpa: settings?.store_upi_id ?? "", name: settings?.store_name ?? "Gupta Ink" }}
      storePhone={settings?.store_phone ?? "7905529544"}
    />
  );
}
