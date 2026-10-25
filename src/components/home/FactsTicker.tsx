import { Bike, Store, Coins, Wallet, Clock } from "lucide-react";
import { rupees } from "@/lib/format";
import type { StoreSettings } from "@/lib/types";

/**
 * The red strip of store facts that scrolls past like a painted shop banner
 * (Aceternity "Infinite moving cards", in CSS). Pauses on hover; still for reduced motion.
 */
export function FactsTicker({ s }: { s: StoreSettings | null }) {
  const facts = [
    { icon: Bike, text: `Delivery in ${s?.quick_eta_min ?? 45}-${s?.quick_eta_max ?? 60} min within ${Number(s?.delivery_radius_km ?? 15)} km` },
    { icon: Wallet, text: `Free delivery over ${rupees(s?.free_delivery_min_paise ?? 49900)}` },
    { icon: Store, text: "Free pickup at Khedi Market" },
    { icon: Coins, text: `${((s?.coin_rate_bp ?? 200) / 100).toFixed(0)}% back in SuperCoins` },
    { icon: Clock, text: "Pay by UPI or cash" },
  ];
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {facts.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2 whitespace-nowrap px-5">
          <Icon className="size-4 text-nib" aria-hidden />
          <span className="sign-type text-[17px] text-white">{text}</span>
          <span className="ml-5 size-1.5 rounded-full bg-white/40" aria-hidden />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Store facts" className="ticker mt-7 overflow-hidden bg-[#cf1f2b] py-2.5 md:mx-4 md:rounded-[12px]">
      <div className="ticker-track">{row(false)}{row(true)}</div>
    </section>
  );
}
