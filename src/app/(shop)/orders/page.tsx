import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import { getSessionProfile } from "@/lib/supabase/server";
import { rupees } from "@/lib/format";
import { STATUS_LABEL, statusTone, when, type OrderRow } from "@/lib/orders";

export const metadata = { title: "Orders" };

type Row = Pick<OrderRow, "id" | "order_no" | "status" | "type" | "payable_paise" | "created_at" | "slot_date" | "slot_start" | "slot_end" | "payment_method"> & {
  order_items: { image_url: string | null; qty: number }[];
};

export default async function OrdersPage() {
  const { supabase, user } = await getSessionProfile();
  if (!user) redirect("/login?next=/orders");
  const { data } = await supabase.from("orders")
    .select("id, order_no, status, type, payable_paise, created_at, slot_date, slot_start, slot_end, payment_method, order_items(image_url, qty)")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const orders = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <h1 className="mb-4 text-2xl font-extrabold">Your orders</h1>
      {orders.length ? (
        <ul className="grid gap-3">
          {orders.map((o) => {
            const awaiting = o.payment_method === "upi" && o.status === "placed";
            const n = o.order_items.reduce((a, i) => a + i.qty, 0);
            return (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 hover:border-ink/30">
                  <span className="flex -space-x-3">
                    {o.order_items.slice(0, 3).map((it, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={it.image_url ?? "/brand/logo.svg"} alt="" className="size-12 rounded-xl border-2 border-card" />
                    ))}
                  </span>
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
