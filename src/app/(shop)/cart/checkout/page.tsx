import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { getSettings } from "@/lib/catalog";
import { CheckoutView, type Slot, type CouponOffer } from "@/components/checkout/CheckoutView";
import type { SavedAddress } from "@/app/actions/addresses";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ buy?: string; qty?: string }> }) {
  const sp = await searchParams;
  const [{ supabase, user, profile }, settings] = await Promise.all([getSessionProfile(), getSettings()]);
  const buy = sp.buy && /^[0-9a-f-]{36}$/.test(sp.buy) ? { productId: sp.buy, qty: Math.max(1, Math.min(20, Number(sp.qty) || 1)) } : null;
  if (!user) redirect(`/login?next=${encodeURIComponent(buy ? `/cart/checkout?buy=${buy.productId}&qty=${buy.qty}` : "/cart/checkout")}`);
  const [addresses, slots, coupons] = await Promise.all([
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
    supabase.rpc("checkout_slots"),
    supabase.from("coupons").select("code, title, description, min_order_paise, type").order("min_order_paise"),
  ]);
  return (
    <CheckoutView
      addresses={(addresses.data ?? []) as SavedAddress[]}
      slots={(slots.data ?? []) as Slot[]}
      coupons={(coupons.data ?? []) as CouponOffer[]}
      radiusKm={Number(settings?.delivery_radius_km ?? 15)}
      storeAddress={settings?.store_address ?? "Khedi Market, Kohima"}
      buyNow={buy}
      profileName={profile?.name ?? null}
      profilePhone={profile?.phone ?? null}
      storeHours={`${settings?.store_open?.slice(0, 5) ?? "10:00"} to ${settings?.store_close?.slice(0, 5) ?? "17:30"}`}
    />
  );
}
