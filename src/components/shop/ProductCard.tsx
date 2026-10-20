import Link from "next/link";
import clsx from "clsx";
import { Star } from "lucide-react";
import { rupees } from "@/lib/format";
import type { GroupCard } from "@/lib/types";
import { AddButton } from "./AddButton";
import { WishlistHeart } from "./WishlistHeart";

export function ProductTile({ card, className, highlight = false }: { card: GroupCard; className?: string; highlight?: boolean }) {
  const extra = card.variants.length - 1;
  const lowStock = card.stock > 0 && card.stock <= 5;
  const href = `/p/${card.slug}${card.variants.length > 1 ? `?v=${card.id}` : ""}`;
  return (
    <div
      data-product-card
      className={clsx(
        "group relative flex flex-col rounded-2xl border bg-card p-2.5 transition-shadow hover:shadow-md hover:shadow-ink/5",
        highlight ? "border-nib ring-2 ring-nib/40" : "border-line",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl">
        <Link href={href} tabIndex={-1} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.images[0] ?? "/brand/logo.svg"} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        </Link>
        {card.discount_pct >= 5 && (
          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-margin px-1.5 py-0.5 text-[11px] font-bold text-white">
            {card.discount_pct}% off
          </span>
        )}
        <WishlistHeart productId={card.id} className="absolute right-1 top-1 z-20" />
      </div>
      <div className="mt-2 flex flex-1 flex-col">
        <Link href={href} className="line-clamp-2 min-h-[2.5rem] text-[13.5px] font-semibold leading-tight text-graphite after:absolute after:inset-x-0 after:top-0 after:h-[calc(100%-3.25rem)] hover:text-ink">
          {card.name}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted">
          {card.variant_label ?? card.unit}
          {extra > 0 && <span className="text-ink"> + {extra} more</span>}
        </p>
        {card.rating_count > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
            <Star className="size-3 fill-nib text-nib" aria-hidden />
            <span className="font-semibold text-graphite">{Number(card.rating_avg).toFixed(1)}</span>
            <span>({card.rating_count})</span>
          </p>
        )}
        {lowStock && <p className="mt-1 text-xs font-semibold text-margin">Only {card.stock} left</p>}
        <div className="relative z-10 mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="leading-tight">
            <p className="text-[15px] font-bold">{rupees(card.price_paise)}</p>
            {card.mrp_paise > card.price_paise && <p className="text-xs text-muted line-through">{rupees(card.mrp_paise)}</p>}
          </div>
          <AddButton product={card} />
        </div>
      </div>
    </div>
  );
}
