"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, RotateCcw, Truck, Store, ReceiptText, Zap } from "lucide-react";
import { useCart, capFor } from "@/components/providers/CartProvider";
import { Price } from "@/components/ui/Num";
import clsx from "clsx";
import { rupees } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import type { GroupCard } from "@/lib/types";
import { AddButton } from "./AddButton";
import { WishlistHeart } from "./WishlistHeart";
import { ProductGallery } from "./ProductGallery";

export function ProductDetail({ card, description, returnable }: { card: GroupCard; description: string | null; returnable: boolean }) {
  const router = useRouter();
  // The page is cached for everyone, so a ?v= variant link is applied right after load
  const [vid, setVid] = useState(card.variants[0].id);
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("v");
    if (want && card.variants.some((x) => x.id === want)) setVid(want);
  }, [card.variants]);
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
  // The pinned buy bar sits over the bottom of the page: give the footer room for it while it shows
  useEffect(() => {
    document.documentElement.style.setProperty("--island-pad", pinned ? "68px" : "0px");
    return () => { document.documentElement.style.setProperty("--island-pad", "0px"); };
  }, [pinned]);
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
          {v.discount_pct >= 5 && <span className="sign-type pointer-events-none absolute left-3 top-3 z-10 rounded-[6px] bg-margin px-2 pb-1 pt-1.5 text-[17px] text-white">{v.discount_pct}% off</span>}
          <WishlistHeart productId={v.id} className="absolute right-3 top-3 z-10 size-10" />
        </ProductGallery>
      </div>

      <div>
        <h1 className="text-[34px] leading-[1.02] sm:text-[44px]">{card.name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-bold text-ink">{card.brand}</span>
          {card.rating_count > 0 && (
            <a href="#reviews" className="inline-flex items-center gap-1.5">
              <span className="text-rule" aria-hidden>·</span>
              <span className="num inline-flex items-center gap-1 rounded-[6px] bg-ok px-1.5 py-0.5 text-xs font-bold text-white">
                {Number(card.rating_avg).toFixed(1)} <Star className="size-3 fill-white" />
              </span>
              <span className="text-muted">{card.rating_count} ratings</span>
            </a>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Price paise={v.price_paise} className="sign-type text-[44px] text-graphite" />
          {v.mrp_paise > v.price_paise && (
            <>
              <span className="num text-muted line-through">MRP {rupees(v.mrp_paise)}</span>
              <span className="num rounded-[6px] bg-ok/12 px-2 py-0.5 text-sm font-bold text-ok">Save {rupees(v.mrp_paise - v.price_paise)}</span>
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
                  className={clsx("press relative flex items-center gap-2 rounded-[10px] bg-card px-3.5 py-2.5 text-sm font-semibold",
                    x.id === v.id ? "text-on-sign" : "text-graphite hover:bg-sunk", x.stock <= 0 && "opacity-50")}>
                  {x.id === v.id && <motion.span layoutId={`variant-${card.group_id}`} className="absolute inset-0 rounded-[10px] bg-sign" transition={{ type: "spring", duration: 0.4, bounce: 0.2 }} />}
                  {hasColours && x.colour_hex && <span className="relative size-5 rounded-full ring-2 ring-white/70" style={{ background: x.colour_hex }} />}
                  <span className="relative">{x.variant_label}</span>
                  {x.price_paise !== v.price_paise && <span className={clsx("num relative font-normal", x.id === v.id ? "text-on-sign-muted" : "text-muted")}>{rupees(x.price_paise)}</span>}
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
              className="sign-type press flex h-12 items-center justify-center gap-1.5 rounded-[9px] bg-sign text-[19px] text-on-sign hover:bg-ink">
              <Zap className="size-4 fill-nib text-nib" /> Buy now
            </Link>
          )}
        </div>

        <AnimatePresence>
          {pinned && capFor(v) > 0 && (
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: "spring", stiffness: 420, damping: 36 }}
              data-pet-avoid className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-card px-3 py-2.5 md:hidden">
              <div className="mx-auto flex max-w-md items-center gap-2.5">
                <div className="min-w-0 shrink-0 leading-tight">
                  <Price paise={v.price_paise} className="sign-type block text-[24px]" />
                  {v.mrp_paise > v.price_paise && <p className="text-[11px] text-muted line-through">{rupees(v.mrp_paise)}</p>}
                </div>
                <AddButton product={v} size="lg" className="!h-11 flex-1" />
                <Link href={buyHref} prefetch={false} className="sign-type press flex h-11 flex-1 items-center justify-center gap-1 rounded-[9px] bg-sign text-[17px] text-on-sign">
                  <Zap className="size-4 fill-nib text-nib" /> Buy now
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="mt-6 grid gap-3 rounded-[12px] bg-card p-4 text-sm">
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
            <h2 className="text-[24px] uppercase">About this item</h2>
            <p className="mt-1.5 max-w-prose text-muted">{description}</p>
          </section>
        )}
      </div>
    </div>
  );
}
