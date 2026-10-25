import { Suspense } from "react";
import { getSettings } from "@/lib/catalog";
import { storeStatus } from "@/lib/hours";
import { AppProviders } from "@/components/providers/AppProviders";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // No cookies here on purpose: shop pages can then be built once and served from the
  // CDN to everyone. Sign-in info is filled in by the browser (SessionProvider).
  const settings = await getSettings();
  const status = storeStatus(settings);
  const store = {
    lat: settings?.store_lat ?? 25.668,
    lng: settings?.store_lng ?? 94.1085,
    radiusKm: Number(settings?.delivery_radius_km ?? 15),
  };
  return (
    <AppProviders user={null} profile={null} store={store}>
      <Header eta={status.eta} deliveryOpen={status.quickOpen} />
      <main className="mx-auto min-h-[70dvh] max-w-6xl pb-24 md:pb-10">{children}</main>
      <Footer />
      <BottomNav />
      <Suspense><OnboardingGate /></Suspense>
    </AppProviders>
  );
}
