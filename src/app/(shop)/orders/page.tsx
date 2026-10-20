import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const { supabase, user } = await getSessionProfile();
  if (!user) redirect("/login?next=/orders");
  const { data: orders } = await supabase.from("orders").select("id, order_no, status, payable_paise, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-extrabold">Your orders</h1>
      {orders?.length ? (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
          {orders.map((o) => (
            <li key={o.id} className="flex justify-between p-4 text-sm"><span className="font-semibold">{o.order_no}</span><span className="text-muted">{o.status}</span></li>
          ))}
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
