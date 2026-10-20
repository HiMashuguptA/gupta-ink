import { getSessionProfile } from "@/lib/supabase/server";
import { OrdersBoard, type BoardOrder } from "./OrdersBoard";
import { ADMIN_ORDER_SELECT } from "@/lib/admin-orders";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const { supabase } = await getSessionProfile();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data } = await supabase.from("orders").select(ADMIN_ORDER_SELECT).gte("created_at", since).order("created_at", { ascending: false }).limit(300);
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Orders</h1>
      <p className="mt-1 text-sm text-muted">Last 30 days. New orders appear here instantly with a chime.</p>
      <OrdersBoard initial={(data ?? []) as unknown as BoardOrder[]} />
    </div>
  );
}
