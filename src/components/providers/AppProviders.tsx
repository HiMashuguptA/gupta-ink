"use client";
import type { User } from "@supabase/supabase-js";
import { SessionProvider } from "./SessionProvider";
import { ToastProvider } from "./ToastProvider";
import { CartProvider } from "./CartProvider";
import { LocationProvider } from "./LocationProvider";
import { FlyProvider } from "./FlyProvider";
import { NotificationListener } from "./NotificationListener";
import type { Profile } from "@/lib/types";

export function AppProviders({
  user, profile, store, children,
}: {
  user: User | null;
  profile: Profile | null;
  store: { lat: number; lng: number; radiusKm: number };
  children: React.ReactNode;
}) {
  return (
    <SessionProvider initialUser={user} initialProfile={profile}>
      <ToastProvider>
        <LocationProvider store={store}>
          <CartProvider>
            <FlyProvider>
              <NotificationListener />
              {children}
            </FlyProvider>
          </CartProvider>
        </LocationProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
