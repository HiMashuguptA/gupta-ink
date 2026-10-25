import type { GroupCard } from "@/lib/types";
import { ProductTile } from "./ProductCard";
import { SectionHead } from "@/components/ui/SectionHead";

export function Rail({ title, href, cards }: { title: string; href?: string; cards: GroupCard[] }) {
  if (!cards.length) return null;
  return (
    <section className="mt-9" aria-label={title}>
      <SectionHead title={title} href={href} className="px-4" />
      <div className="no-scrollbar flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1">
        {cards.map((c, k) => (
          <ProductTile key={c.group_id} card={c} index={k} className="w-[158px] shrink-0 snap-start sm:w-[180px]" />
        ))}
      </div>
    </section>
  );
}

export function Grid({ cards, highlightId }: { cards: GroupCard[]; highlightId?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((c, k) => (
        <ProductTile key={c.group_id} card={c} index={k % 10} highlight={c.group_id === highlightId} />
      ))}
    </div>
  );
}
