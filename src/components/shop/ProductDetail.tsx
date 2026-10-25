"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Star, RotateCcw, Truck, Store, ReceiptText, Zap } from "lucide-react";
import { useCart, capFor } from "@/components/providers/CartProvider";
import clsx from "clsx";
import { rupees } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import type { GroupCard } from "@/lib/types";
import { AddButton } from "./AddButton";
import { WishlistHeart } from "./WishlistHeart";
import { ProductGallery } from "./ProductGallery";

export function ProductDetail({ card, description, returnable }: { card: GroupCard; description: string | null; returnable: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = card.variants.find((v) => v.id === params.get("v")) ?? card.variants[0];
  const [vid, setVid] = useState(initial.id);
  const v = card.variants.find((x) => x.id === vid) ?? card.variants[0];

  const { user } = useSession();
  const { qtyOf } = useCart();
  // Buy now skips the cart: checkout gets just this item (the cart's qty if it's already there)
  const buyQty = Math.max(1, qtyOf(v.id));
  // Phones: when the main buttons scroll away, keep Add to cart / Buy now pinned above the tab bar
  const actionsRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = actionsRef.current;
      if (el) setPinned(el.getBoundingClientRect().bottom < 64);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);
  const buyHref = `/cart/checkout?buy=${v.id}&qty=${buyQty}`;
  useEffect(() => {
    if (user) void supabaseBrowser().rpc("track_view", { p_group: card.group_id });
  }, [card.group_id, user]);

  const pick = (id: string) => {
    setVid(id);
    router.replace(`?v=${id}`, { scroll: false });
  };

  const hasColours = card.variants.some((x) => x.colour_hex && x.colour);

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-10">
      <div data-product-card className="relative">
        <ProductGallery images={v.images} alt={`${card.name}${v.variant_label ? `, ${v.variant_label}` : ""}`} resetKey={v.id}>
          {v.discount_pct >= 5 && <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-margin px-2 py-1 text-xs font-bold text-white">{v.discount_pct}% off</span>}
          <WishlistHeart productId={v.id} className="absolute right-3 top-3 size-10" />
        </ProductGallery>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink">{card.brand}</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{card.name}</h1>
        {card.rating_count > 0 && (
          <a href="#reviews" className="mt-2 inline-flex items-center gap-1.5 text-sm">
            <span className="inline-flex items-center gap-1 rounded-md bg-ok px-1.5 py-0.5 text-xs font-bold text-white">
              {Number(card.rating_avg).toFixed(1)} <Star className="size-3 fill-white" />
            </span>
            <span className="text-muted">{card.rating_count} ratings</span>
          </a>
        )}

        <div className="mt-4 flex items-baseline gap-2.5">
          <span className="font-display text-3xl font-extrabold">{rupees(v.price_paise)}</span>
          {v.mrp_paise > v.price_paise && (
            <>
              <span className="text-muted line-through">MRP {rupees(v.mrp_paise)}</span>
              <span className="font-bold text-ok">Save {rupees(v.mrp_paise - v.price_paise)}</span>
            </>
          )}
        </div>
        <p className="text-xs text-muted">Inclusive of all taxes, per {v.unit}</p>

        {card.variants.length > 1 && (
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-bold">{hasColours ? "Colour" : "Option"}: <span className="font-semibold text-muted">{v.variant_label}</span></legend>
            <div className="flex flex-wrap gap-2.5">
              {card.variants.map((x) => (
                <button key={x.id} type="button" onClick={() => pick(x.id)} aria-pressed={x.id === v.id}
                  className={clsx("flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-sm font-semibold transition-colors",
                    x.id === v.id ? "border-ink bg-ink-soft text-ink" : "border-line bg-card hover:border-ink/40",
                    x.stock <= 0 && "opacity-50")}>
                  {hasColours && x.colour_hex && <span className="size-5 rounded-full border border-black/10" style={{ background: x.colour_hex }} />}
                  {x.variant_label}
                  {x.price_paise !== v.price_paise && <span className="font-normal text-muted">{rupees(x.price_paise)}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {v.stock > 0 && v.stock <= 5 && <p className="mt-4 text-sm font-semibold text-margin">Hurry, only {v.stock} left in the store</p>}

        <div ref={actionsRef} className="mt-5 grid max-w-md grid-cols-2 gap-2.5">
          <AddButton product={v} size="lg" />
          {capFor(v) > 0 && (
            <Link href={buyHref} prefetch={false}
              className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-nib font-bold text-[#1f1605] shadow-sm transition-transform hover:brightness-105 active:scale-[.97]">
              <Zap className="size-4 fill-current" /> Buy now
            </Link>
          )}
        </div>

        <AnimatePresence>
          {pinned && capFor(v) > 0 && (
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-card/95 px-3 py-2.5 backdrop-blur md:hidden">
              <div className="mx-auto flex max-w-md items-center gap-2.5">
                <div className="min-w-0 shrink-0 leading-tight">
                  <p className="font-display text-lg font-extrabold">{rupees(v.price_paise)}</p>
                  {v.mrp_paise > v.price_paise && <p className="text-[11px] text-muted line-through">{rupees(v.mrp_paise)}</p>}
                </div>
                <AddButton product={v} size="lg" className="!h-11 flex-1" />
                <Link href={buyHref} prefetch={false} className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-nib text-sm font-bold text-[#1f1605] active:scale-[.97]">
                  <Zap className="size-4 fill-current" /> Buy now
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="mt-6 grid gap-3 rounded-2xl border border-line bg-card p-4 text-sm">
          <li className="flex gap-3"><Truck className="size-5 shrink-0 text-ink" /><span>Delivery in 45-60 min within 15 km of Khedi Market, or pick a 2-hour slot</span></li>
          <li className="flex gap-3"><Store className="size-5 shrink-0 text-ink" /><span>Free store pickup, pay in the app or at the counter</span></li>
          <li className="flex gap-3">
            <RotateCcw className="size-5 shrink-0 text-ink" />
            <span>{returnable ? "Easy returns within 3 days of delivery" : "This item can't be returned once opened"}</span>
          </li>
          <li className="flex gap-3"><ReceiptText className="size-5 shrink-0 text-ink" /><span>Downloadable bill with every order. Need a GST invoice? Ask the store.</span></li>
        </ul>

        {description && (
          <section className="mt-6">
            <h2 className="text-lg font-bold">About this item</h2>
            <p className="mt-1.5 max-w-prose text-muted">{description}</p>
          </section>
        )}
      </div>
    </div>
  );
}
