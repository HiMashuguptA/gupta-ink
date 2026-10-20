"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { ChevronDown, ShoppingBag, UserRound, Bell, Store } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SearchBox } from "./SearchBox";
import { useLocation } from "@/components/providers/LocationProvider";
import { useCart } from "@/components/providers/CartProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { LocationSheet } from "@/components/location/LocationSheet";

export function Header({ eta, deliveryOpen }: { eta: string; deliveryOpen: boolean }) {
  const { location, status, dismissed, dismiss } = useLocation();
  const { count } = useCart();
  const { user, profile } = useSession();
  const [sheet, setSheet] = useState(false);

  // Ask for location on first open, as the brief asks, unless already set or dismissed
  useEffect(() => {
    if (!location && !dismissed) {
      const t = setTimeout(() => setSheet(true), 700);
      return () => clearTimeout(t);
    }
  }, [location, dismissed]);

  const outOfRange = status === "out_of_range";
  const headline = !location
    ? "Set delivery location"
    : outOfRange
      ? "Pickup only at this address"
      : deliveryOpen ? `Delivery in ${eta}` : "Schedule a delivery";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-3">
        <Link href="/" className="shrink-0" aria-label="Gupta Ink home">
          <span className="sm:hidden"><Logo size={34} wordmark={false} /></span>
          <span className="hidden sm:inline-flex"><Logo size={34} /></span>
        </Link>
        <button onClick={() => setSheet(true)} className="min-w-0 flex-1 text-left sm:ml-4" aria-label="Change delivery location">
          <span className={`flex items-center gap-1 font-display text-[15px] font-bold leading-tight ${outOfRange ? "text-margin" : "text-graphite"}`}>
            {outOfRange && <Store className="size-4" />}
            {headline}
          </span>
          <span className="flex items-center gap-0.5 truncate text-xs text-muted">
            <span className="truncate">{location?.label ?? "Khedi Market, Kohima"}</span>
            <ChevronDown className="size-3.5 shrink-0" />
          </span>
        </button>
        <div className="hidden w-[420px] md:block"><Suspense><SearchBox /></Suspense></div>
        <nav className="flex items-center gap-1">
          {user && (
            <Link href="/account/notifications" className="grid size-10 place-items-center rounded-full hover:bg-ink-soft" aria-label="Notifications">
              <Bell className="size-5 text-graphite" />
            </Link>
          )}
          <Link href="/cart" data-cart-target className="relative hidden size-10 place-items-center rounded-full hover:bg-ink-soft md:grid" aria-label={`Cart, ${count} items`}>
            <ShoppingBag className="size-5 text-graphite" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-nib px-1 text-[11px] font-bold text-ink-deep">{count}</span>}
          </Link>
          <Link href={user ? "/account" : "/login"} className="grid size-10 place-items-center overflow-hidden rounded-full hover:bg-ink-soft" aria-label={user ? "Your account" : "Sign in"}>
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <UserRound className="size-5 text-graphite" />
            )}
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-3 pt-2.5 md:hidden"><Suspense><SearchBox /></Suspense></div>
      <div className="hidden pb-3 md:block" />
      <LocationSheet open={sheet} onClose={() => { setSheet(false); dismiss(); }} />
    </header>
  );
}
