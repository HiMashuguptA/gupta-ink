"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Home, LayoutGrid, ShoppingBag, Package, UserRound } from "lucide-react";
import clsx from "clsx";
import { useCart } from "@/components/providers/CartProvider";
import { CountBadge } from "@/components/ui/Num";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/categories", label: "Shop", icon: LayoutGrid },
  { href: "/cart", label: "Cart", icon: ShoppingBag, cart: true },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/account", label: "You", icon: UserRound },
];

/** Phone tab bar. The green board under the active tab slides between tabs (Aceternity "Animated tabs"). */
export function BottomNav() {
  const path = usePathname();
  const { count } = useCart();
  const reduce = useReducedMotion();
  return (
    <nav style={{ viewTransitionName: "bottom-nav" }}
      data-pet-avoid className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
      <ul className="mx-auto grid max-w-md grid-cols-5 px-1.5 pt-1.5">
        {items.map(({ href, label, icon: Icon, cart }) => {
          const on = href === "/" ? path === "/" : path.startsWith(href) || (href === "/categories" && (path.startsWith("/c/") || path.startsWith("/collections")));
          return (
            <li key={href}>
              <Link href={href} prefetch className="press flex flex-col items-center gap-0.5 pb-1.5 text-[11px] font-semibold" aria-current={on ? "page" : undefined}>
                <span className="relative grid h-8 w-14 place-items-center" {...(cart ? { "data-cart-target": "" } : {})}>
                  {on && (
                    <motion.span layoutId="tab-board" className="absolute inset-0 rounded-[10px] bg-sign"
                      transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0.2 }} />
                  )}
                  <Icon className={clsx("relative size-[21px] transition-colors duration-200", on ? "text-nib" : "text-muted")} strokeWidth={on ? 2.4 : 2} />
                  {cart && <CountBadge value={count} className="absolute -top-1 right-1.5 !ring-card" />}
                </span>
                <span className={clsx("transition-colors duration-200", on ? "text-graphite" : "text-muted")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
