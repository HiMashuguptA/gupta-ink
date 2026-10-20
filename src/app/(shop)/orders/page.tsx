import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import { getSessionProfile } from "@/lib/supabase/server";
import { productLinks } from "@/lib/catalog";
import { LiveRefresh } from "@/components/live/LiveRefresh";
import { BuyAgain } from "@/components/orders/BuyAgain";
import { rupees } from "@/lib/format";
import { STATUS_LABEL, statusTone, when, type OrderRow } from "@/lib/orders";

export const metadata = { title: "Orders" };

type Row = Pick<OrderRow, "id" | "order_no" | "status" | "type" | "payable_paise" | "created_at" | "slot_date" | "slot_start" | "slot_end" | "payment_method"> & {
  order_items: { product_id: string; name: string; image_url: string | null; qty: number }[];
};

export default async function OrdersPage() {
  const { supabase, user } = await getSessionProfile();
  if (!user) redirect("/login?next=/orders");
  const { data } = await supabase.from("orders")
    .select("id, order_no, status, type, payable_paise, created_at, slot_date, slot_start, slot_end, payment_method, order_items(product_id, name, image_url, qty)")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const orders = (data ?? []) as unknown as Row[];
  const links = await productLinks([...new Set(orders.flatMap((o) => o.order_items.map((i) => i.product_id)))]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <LiveRefresh at={Date.now()} id={`orders-${user.id}`} watch={[{ table: "orders", filter: `user_id=eq.${user.id}` }, { table: "returns", filter: `user_id=eq.${user.id}` }]} />
      <h1 className="mb-4 text-2xl font-extrabold">Your orders</h1>
      {orders.length ? (
        <ul className="grid gap-3">
          {orders.map((o) => {
            const awaiting = o.payment_method === "upi" && o.status === "placed";
            const n = o.order_items.reduce((a, i) => a + i.qty, 0);
            return (
              <li key={o.id} className="overflow-hidden rounded-2xl border border-line bg-card">
                <Link href={`/orders/${o.id}`} className="flex items-center gap-3 p-3.5 hover:bg-paper">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{o.order_no}</span>
                      <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-bold", statusTone(o.status))}>{awaiting ? "Awaiting payment" : STATUS_LABEL[o.status]}</span>
                    </span>
                    <span className="block truncate text-sm text-muted">{n} {n === 1 ? "item" : "items"}, {rupees(o.payable_paise)}, {when(o)}</span>
                    <span className="block text-xs text-muted">{new Date(o.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}</span>
                  </span>
                  <ChevronRight className="size-5 text-muted" />
                </Link>
                <div className="flex items-center gap-2 border-t border-line px-3.5 py-2.5">
                  <ul className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto" aria-label={`Items in ${o.order_no}`}>
                    {o.order_items.map((it, i) => {
                      // eslint-disable-next-line @next/next/no-img-element
                      const img = <img src={it.image_url ?? "/brand/logo.svg"} alt={it.name} className="size-11 rounded-lg border border-line object-cover" />;
                      return (
                        <li key={i} className="shrink-0">
                          {links[it.product_id]
                            ? <Link href={links[it.product_id]} title={`Open ${it.name}`} className="block rounded-lg hover:ring-2 hover:ring-ink/30">{img}</Link>
                            : <span title={`${it.name} (no longer sold)`} className="block opacity-60">{img}</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {["delivered", "collected", "completed", "cancelled"].includes(o.status) && (
                    <BuyAgain items={o.order_items.map((i) => ({ product_id: i.product_id, qty: i.qty }))}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-ink px-3 text-xs font-semibold text-ink disabled:opacity-50" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="ruled rounded-3xl p-8 pl-14">
          <h2 className="text-lg font-bold">No orders yet</h2>
          <p className="mt-1 text-muted">When you place an order, you&apos;ll track it here live, right up to your door.</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Start shopping</Link>
        </div>
      )}
    </div>
  );
}
