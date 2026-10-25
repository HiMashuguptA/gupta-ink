"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { ChevronDown, ShoppingBag, UserRound, MapPin, Store } from "lucide-react";
import clsx from "clsx";
import { NotificationBell } from "./NotificationBell";
import { Logo } from "@/components/brand/Logo";
import { SearchBox } from "./SearchBox";
import { HangingSign } from "./HangingSign";
import { CountBadge } from "@/components/ui/Num";
import { useLocation } from "@/components/providers/LocationProvider";
import { useCart } from "@/components/providers/CartProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { LocationSheet } from "@/components/location/LocationSheet";
import type { StoreHours } from "@/lib/hours";

/**
 * The shop's signboard: green board with the logo plate, the hanging OPEN/CLOSED sign,
 * where we deliver, and search. On phones the top row tucks away while you scroll down
 * and comes back when you scroll up; search always stays.
 */
export function Header({ hours }: { hours: StoreHours | null }) {
  const { location, status, dismissed, dismiss } = useLocation();
  const { count } = useCart();
  const { user, profile, ready } = useSession();
  const [sheet, setSheet] = useState(false);
  const [tucked, setTucked] = useState(false);
  const last = useRef(0);

  // Ask for location on first open, unless already set or dismissed
  useEffect(() => {
    if (!location && !dismissed) {
      const t = setTimeout(() => setSheet(true), 700);
      return () => clearTimeout(t);
    }
  }, [location, dismissed]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY, d = y - last.current;
        if (Math.abs(d) > 6) { setTucked(d > 0 && y > 140); last.current = y; }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  const outOfRange = status === "out_of_range";
  const title = !location ? "Deliver to" : outOfRange ? "Pickup only here" : `Deliver to ${location.label?.split(",")[0] ?? "you"}`;
  const sub = !location ? "Set your location" : location.label ?? "Pinned location";

  return (
    <header style={{ viewTransitionName: "site-header" }}
      className={clsx("sticky top-0 z-40 bg-sign text-on-sign transition-transform duration-300 ease-[var(--ease-out)] md:translate-y-0", tucked ? "-translate-y-[62px]" : "translate-y-0")}>
      <div className="mx-auto flex h-[62px] max-w-6xl items-center gap-2.5 px-4 md:h-[70px] md:gap-4">
        <Link href="/" className="press shrink-0 rounded-[8px]" aria-label="Gupta Enterprises home">
          <Logo size={38} tone="sign" wordmark="responsive" />
        </Link>

        <button onClick={() => setSheet(true)} className="press group min-w-0 flex-1 rounded-[8px] py-1 text-left md:max-w-[220px] md:flex-none" aria-label={location ? `${title}. Change delivery location` : "Set delivery location"}>
          <span className={clsx("flex items-center gap-1 text-[13px] font-bold leading-tight", outOfRange ? "text-nib" : "text-on-sign")}>
            {outOfRange ? <Store className="size-3.5 shrink-0" /> : <MapPin className="size-3.5 shrink-0" />}
            <span className="truncate">{title}</span>
            <ChevronDown className="size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-y-0.5" />
          </span>
          <span className="block truncate text-[12px] text-on-sign-muted">{sub}</span>
        </button>

        <div className="hidden flex-1 md:block"><Suspense><SearchBox id="search-desktop" /></Suspense></div>

        <div className="shrink-0 -my-1"><HangingSign hours={hours} /></div>

        <nav className="flex shrink-0 items-center gap-0.5" aria-label="Account">
          {user && <NotificationBell userId={user.id} />}
          <Link href="/cart" data-cart-target className="press relative hidden size-10 place-items-center rounded-full hover:bg-white/10 md:grid" aria-label={`Cart, ${count} items`}>
            <ShoppingBag className="size-5" />
            <CountBadge value={count} className="absolute -right-0.5 -top-0.5" />
          </Link>
          <Link href={user || !ready ? "/account" : "/login"} className="press grid size-10 place-items-center overflow-hidden rounded-full hover:bg-white/10" aria-label={user ? "Your account" : ready ? "Sign in" : "Account"}>
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="size-8 rounded-full ring-2 ring-nib/80" referrerPolicy="no-referrer" />
            ) : (
              <UserRound className="size-5" />
            )}
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden"><Suspense><SearchBox id="search-mobile" /></Suspense></div>
      <LocationSheet open={sheet} onClose={() => { setSheet(false); dismiss(); }} />
    </header>
  );
}
