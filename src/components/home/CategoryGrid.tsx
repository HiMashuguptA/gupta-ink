import Link from "next/link";
import type { Category } from "@/lib/types";

export function CategoryGrid({ categories, title = "Shop by category" }: { categories: Category[]; title?: string }) {
  return (
    <section className="mt-7 px-4" aria-label={title}>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <ul className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-5 lg:grid-cols-10">
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={`/c/${c.slug}`} className="group flex flex-col items-center text-center">
              <span className="aspect-square w-full overflow-hidden rounded-2xl border border-line bg-card transition-transform group-hover:-translate-y-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image_url ?? "/brand/logo.svg"} alt="" className="size-full object-cover" loading="lazy" />
              </span>
              <span className="mt-1.5 text-[12px] font-semibold leading-tight">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
