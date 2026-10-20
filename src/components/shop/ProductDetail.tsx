"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star, RotateCcw, Truck, Store, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { rupees } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import type { GroupCard } from "@/lib/types";
import { AddButton } from "./AddButton";
import { WishlistHeart } from "./WishlistHeart";

export function ProductDetail({ card, description, returnable }: { card: GroupCard; description: string | null; returnable: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = card.variants.find((v) => v.id === params.get("v")) ?? card.variants[0];
  const [vid, setVid] = useState(initial.id);
  const v = card.variants.find((x) => x.id === vid) ?? card.variants[0];

  const { user } = useSession();
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
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-card">
          <AnimatePresence mode="wait">
            <motion.img key={v.id} src={v.images[0] ?? "/brand/logo.svg"} alt={`${card.name}${v.variant_label ? `, ${v.variant_label}` : ""}`}
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="size-full object-cover" />
          </AnimatePresence>
          {v.discount_pct >= 5 && <span className="absolute left-3 top-3 rounded-lg bg-margin px-2 py-1 text-xs font-bold text-white">{v.discount_pct}% off</span>}
          <WishlistHeart productId={v.id} className="absolute right-3 top-3 size-10" />
        </div>
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

        <div className="mt-5 max-w-sm"><AddButton product={v} size="lg" /></div>

        <ul className="mt-6 grid gap-3 rounded-2xl border border-line bg-card p-4 text-sm">
          <li className="flex gap-3"><Truck className="size-5 shrink-0 text-ink" /><span>Delivery in 45-60 min within 15 km of Khedi Market, or pick a 2-hour slot</span></li>
          <li className="flex gap-3"><Store className="size-5 shrink-0 text-ink" /><span>Free store pickup, pay in the app or at the counter</span></li>
          <li className="flex gap-3">
            <RotateCcw className="size-5 shrink-0 text-ink" />
            <span>{returnable ? "Easy returns within 3 days of delivery" : "This item can't be returned once opened"}</span>
          </li>
          <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-ink" /><span>GST invoice with every order</span></li>
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
