import { getSessionProfile } from "@/lib/supabase/server";
import { getCategories } from "@/lib/catalog";
import { CouponManager, type Coupon } from "./CouponManager";

export const metadata = { title: "Coupons" };

export default async function AdminCoupons() {
  const { supabase } = await getSessionProfile();
  const [coupons, categories] = await Promise.all([
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    getCategories(),
  ]);
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-extrabold">Coupons</h1>
      <p className="mt-1 text-sm text-muted">Active coupons show at checkout for the customers they&apos;re meant for. The database checks every rule again when an order is placed.</p>
      <CouponManager initial={(coupons.data ?? []) as unknown as Coupon[]} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
