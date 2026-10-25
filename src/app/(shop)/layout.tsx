import { Suspense } from "react";
import { getSettings } from "@/lib/catalog";
import { AppProviders } from "@/components/providers/AppProviders";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { HideOn } from "@/components/layout/HideOn";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { OrderIsland } from "@/components/orders/OrderIsland";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // No cookies here on purpose: shop pages can then be built once and served from the
  // CDN to everyone. Sign-in info is filled in by the browser (SessionProvider).
  const settings = await getSettings();
  // Opening hours go to the browser; the hanging sign works out OPEN / CLOSED from the live clock
  const hours = settings ? {
    store_open: settings.store_open, store_close: settings.store_close, delivery_start: settings.delivery_start,
    quick_last_order: settings.quick_last_order, orders_paused: settings.orders_paused,
    quick_eta_min: settings.quick_eta_min, quick_eta_max: settings.quick_eta_max,
  } : null;
  const store = {
    lat: settings?.store_lat ?? 25.668,
    lng: settings?.store_lng ?? 94.1085,
    radiusKm: Number(settings?.delivery_radius_km ?? 15),
  };
  return (
    <AppProviders user={null} profile={null} store={store}>
      <Header hours={hours} />
      <OrderIsland />
      <main className="mx-auto min-h-[70dvh] max-w-6xl md:pb-10">{children}</main>
      {/* No full footer where it would distract from the task */}
      <HideOn prefixes={["/cart/checkout", "/orders/"]}><Footer /></HideOn>
      <HideOn prefixes={["/cart/checkout", "/orders/"]} invert><div className="h-20 md:hidden" aria-hidden /></HideOn>
      <BottomNav />
      <Suspense><OnboardingGate /></Suspense>
    </AppProviders>
  );
}
