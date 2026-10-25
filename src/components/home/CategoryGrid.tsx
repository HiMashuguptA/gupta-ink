import { Link } from "next-view-transitions";
import type { Category } from "@/lib/types";
import { SectionHead } from "@/components/ui/SectionHead";

/** Category boards: each picture wipes open from the top as it scrolls in (Skiper "Image reveal"). */
export function CategoryGrid({ categories, title = "Shop by category", showAll = true }: { categories: Category[]; title?: string; showAll?: boolean }) {
  return (
    <section className="mt-9 px-4" aria-label={title}>
      <SectionHead title={title} href={showAll ? "/categories" : undefined} action="All aisles" />
      <ul className="grid grid-cols-3 gap-2.5 min-[420px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-10">
        {categories.map((c, k) => (
          <li key={c.id} className="reveal-clip" style={{ "--i": k % 10 } as React.CSSProperties}>
            <Link href={`/c/${c.slug}`} className="press group flex h-full flex-col overflow-hidden rounded-[12px] bg-card">
              <span className="block aspect-square overflow-hidden bg-sunk">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image_url ?? "/brand/logo.svg"} alt="" loading="lazy" decoding="async"
                  className="size-full object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.06]" />
              </span>
              <span className="flex flex-1 items-center px-2 py-2 text-[12.5px] font-bold leading-tight text-graphite">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
