import Link from "next/link";
import type { GroupCard } from "@/lib/types";
import { ProductTile } from "./ProductCard";

export function Rail({ title, href, cards }: { title: string; href?: string; cards: GroupCard[] }) {
  if (!cards.length) return null;
  return (
    <section className="mt-7" aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between px-4">
        <h2 className="text-lg font-bold text-graphite">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-semibold text-ink hover:underline">
            View all
          </Link>
        )}
      </div>
      <div className="no-scrollbar flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {cards.map((c) => (
          <ProductTile key={c.group_id} card={c} className="w-[156px] shrink-0 snap-start sm:w-[176px]" />
        ))}
      </div>
    </section>
  );
}

export function Grid({ cards, highlightId }: { cards: GroupCard[]; highlightId?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((c) => (
        <ProductTile key={c.group_id} card={c} highlight={c.group_id === highlightId} />
      ))}
    </div>
  );
}
