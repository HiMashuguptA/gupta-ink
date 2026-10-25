"use client";
import { Link } from "next-view-transitions";
import clsx from "clsx";
import { Star } from "lucide-react";
import { rupees } from "@/lib/format";
import type { GroupCard } from "@/lib/types";
import { AddButton } from "./AddButton";
import { WishlistHeart } from "./WishlistHeart";

/** Name the tapped tile's picture so it grows into the product page's picture (view transition). */
export function nameHero(e: React.MouseEvent) {
  const img = (e.currentTarget as HTMLElement).closest("[data-product-card]")?.querySelector<HTMLElement>("img[data-hero]");
  if (!img) return;
  // Only one element may carry the name at a time (the open product page's own picture has it)
  document.querySelectorAll<HTMLElement>("img").forEach((el) => { if (el.style.viewTransitionName === "product-hero") el.style.viewTransitionName = ""; });
  img.style.viewTransitionName = "product-hero";
}

export function ProductTile({ card, className, highlight = false, index = 0 }: { card: GroupCard; className?: string; highlight?: boolean; index?: number }) {
  const extra = card.variants.length - 1;
  const lowStock = card.stock > 0 && card.stock <= 5;
  const href = `/p/${card.slug}${card.variants.length > 1 ? `?v=${card.id}` : ""}`;
  return (
    <div data-product-card style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
      className={clsx("reveal group relative flex flex-col overflow-hidden rounded-[12px] bg-card", highlight && "ring-2 ring-nib", className)}>
      <div className="relative aspect-square overflow-hidden border-b border-line bg-white">
        <Link href={href} tabIndex={-1} aria-hidden onClick={nameHero}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-hero src={card.images[0] ?? "/brand/logo.svg"} alt="" loading="lazy" decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.05]" />
        </Link>
        {card.discount_pct >= 5 && (
          <span className="sign-type pointer-events-none absolute left-0 top-0 rounded-br-[10px] bg-[#cf1f2b] px-2 pb-[5px] pt-[6px] text-[14px] text-white">
            {card.discount_pct}% off
          </span>
        )}
        <WishlistHeart productId={card.id} plain className="absolute right-0.5 top-0.5 z-20" />
      </div>
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2">
        <Link href={href} onClick={nameHero}
          className="line-clamp-2 min-h-[2.5rem] text-[13.5px] font-semibold leading-tight text-graphite after:absolute after:inset-x-0 after:top-0 after:h-[calc(100%-3.25rem)] hover:text-ink">
          {card.name}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted">
          {card.variant_label ?? card.unit}
          {extra > 0 && <span className="font-semibold text-ink"> + {extra} more</span>}
        </p>
        {card.rating_count > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
            <Star className="size-3 fill-nib text-nib" aria-hidden />
            <span className="num font-semibold text-graphite">{Number(card.rating_avg).toFixed(1)}</span>
            <span className="num">({card.rating_count})</span>
          </p>
        )}
        {lowStock && <p className="mt-1 text-xs font-semibold text-margin">Only {card.stock} left</p>}
        <div className="relative z-10 mt-auto flex items-end justify-between gap-2 pt-2">
          {/* Price painted on a small tag plate */}
          <div className="leading-none">
            <p className="sign-type num inline-block rounded-[5px] bg-ink-soft px-1.5 pb-[3px] pt-[5px] text-[21px] text-ink-deep">{rupees(card.price_paise)}</p>
            {card.mrp_paise > card.price_paise && <p className="num mt-1 text-[11px] text-muted line-through">{rupees(card.mrp_paise)}</p>}
          </div>
          <AddButton product={card} />
        </div>
      </div>
    </div>
  );
}
