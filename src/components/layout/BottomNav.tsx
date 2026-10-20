"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, Package, UserRound } from "lucide-react";
import clsx from "clsx";
import { useCart } from "@/components/providers/CartProvider";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/cart", label: "Cart", icon: ShoppingBag, cart: true },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/account", label: "Account", icon: UserRound },
];

export function BottomNav() {
  const path = usePathname();
  const { count } = useCart();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Main">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon, cart }) => {
          const on = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={clsx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", on ? "text-ink" : "text-muted")} aria-current={on ? "page" : undefined}>
                <span className="relative" {...(cart ? { "data-cart-target": "" } : {})}>
                  <Icon className={clsx("size-[22px]", on && "stroke-[2.4]")} />
                  {cart && count > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full bg-nib px-1 text-[10px] font-bold text-ink-deep">{count}</span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
