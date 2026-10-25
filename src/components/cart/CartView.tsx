"use client";
import Link from "next/link";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, Truck } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { rupees } from "@/lib/format";

type Rules = { min_order_paise: number; delivery_fee_paise: number; free_delivery_min_paise: number };

export function CartView({ rules }: { rules: Rules }) {
  const { lines, itemsTotal, mrpTotal, setQty, remove, refreshPrices, count } = useCart();
  const { user, ready } = useSession();

  // Prices and stock are re-read from the store every time the cart opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void refreshPrices(); }, []);

  if (!lines.length) {
    return (
      <div className="ruled mx-4 mt-6 rounded-3xl p-8 pl-14">
        <h1 className="text-2xl font-extrabold">Your cart is empty</h1>
        <p className="mt-1 text-muted">Pens, notebooks and exam supplies, delivered in under an hour.</p>
        <Link href="/" className="mt-5 inline-flex rounded-xl bg-ink px-5 py-3 font-semibold text-white">Start shopping</Link>
      </div>
    );
  }

  const unavailable = lines.filter((l) => l.stock <= 0);
  const freeGap = Math.max(0, rules.free_delivery_min_paise - itemsTotal);
  const delivery = itemsTotal >= rules.free_delivery_min_paise ? 0 : rules.delivery_fee_paise;
  const belowMin = itemsTotal < rules.min_order_paise;
  const progress = Math.min(100, (itemsTotal / rules.free_delivery_min_paise) * 100);

  return (
    <div className="grid gap-5 px-4 pt-4 lg:grid-cols-[1fr_360px]">
      <section aria-label="Items in your cart">
        <h1 className="text-2xl font-extrabold">Cart <span className="text-base font-semibold text-muted">({count} {count === 1 ? "item" : "items"})</span></h1>

        <div className="mt-3 rounded-2xl border border-line bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Truck className="size-4 text-ink" />
            {freeGap > 0 ? <>Add {rupees(freeGap)} more for free delivery</> : <>You&apos;ve unlocked free delivery</>}
          </p>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-soft">
            <motion.div className="h-full rounded-full bg-nib" initial={false} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
          </div>
        </div>

        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card">
          <AnimatePresence initial={false}>
            {lines.map((l) => (
              <motion.li key={l.product_id} layout exit={{ opacity: 0, height: 0 }} className="flex gap-3 p-3">
                <Link href={`/p/${l.slug}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.image ?? "/brand/logo.svg"} alt="" className="size-20 rounded-xl" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/p/${l.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-ink">{l.name}</Link>
                  {l.variant_label && <p className="text-xs text-muted">{l.variant_label}</p>}
                  {l.stock <= 0 && <p className="mt-0.5 text-xs font-semibold text-margin">Out of stock, remove to continue</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="leading-tight">
                      <p className="font-bold">{rupees(l.price_paise * l.qty)}</p>
                      {l.mrp_paise > l.price_paise && <p className="text-xs text-muted line-through">{rupees(l.mrp_paise * l.qty)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => remove(l.product_id)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-paper hover:text-margin" aria-label={`Remove ${l.name}`}>
                        <Trash2 className="size-4" />
                      </button>
                      <div className="flex h-9 items-center rounded-xl bg-ink text-white">
                        <button onClick={() => setQty(l.product_id, l.qty - 1)} className="grid h-full w-9 place-items-center" aria-label="Remove one"><Minus className="size-4" /></button>
                        <span className="min-w-6 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                        <button onClick={() => setQty(l.product_id, l.qty + 1)} disabled={l.qty >= Math.min(l.max_per_order, l.stock)} className="grid h-full w-9 place-items-center disabled:opacity-40" aria-label="Add one more"><Plus className="size-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Bill summary">
        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-bold">Bill summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Items (MRP)</dt><dd>{rupees(mrpTotal)}</dd></div>
            {mrpTotal > itemsTotal && <div className="flex justify-between text-ok"><dt>Store discount</dt><dd>−{rupees(mrpTotal - itemsTotal)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Delivery fee</dt><dd>{delivery ? rupees(delivery) : <span className="font-semibold text-ok">Free</span>}</dd></div>
            <div className="flex justify-between border-t border-dashed border-line pt-2 text-base font-bold"><dt>Estimated total</dt><dd>{rupees(itemsTotal + delivery)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-muted">Coupons, SuperCoins and the final total are applied at checkout. Store pickup is always free.</p>
          {belowMin && <p className="mt-3 rounded-xl bg-nib-soft px-3 py-2 text-sm">Minimum order is {rupees(rules.min_order_paise)}. Add {rupees(rules.min_order_paise - itemsTotal)} more.</p>}
          <Link
            href={user || !ready ? "/cart/checkout" : "/login?next=/cart/checkout"}
            aria-disabled={belowMin || unavailable.length > 0}
            className={`mt-4 flex h-12 items-center justify-center rounded-xl font-semibold text-white ${belowMin || unavailable.length ? "pointer-events-none bg-muted/50" : "bg-ink"}`}
          >
            {user || !ready ? "Proceed to checkout" : "Sign in to check out"}
          </Link>
        </div>
      </aside>
    </div>
  );
}
