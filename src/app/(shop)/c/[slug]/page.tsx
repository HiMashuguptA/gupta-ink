import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCategories, getCategoryProducts } from "@/lib/catalog";
import { FilteredGrid } from "@/components/shop/FilteredGrid";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cats = await getCategories();
  return { title: cats.find((c) => c.slug === slug)?.name ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ highlight?: string; from?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [data, categories] = await Promise.all([getCategoryProducts(slug), getCategories()]);
  if (!data) notFound();

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/categories" className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label="All categories"><ChevronLeft className="size-5" /></Link>
        <h1 className="text-2xl font-extrabold">{data.category.name}</h1>
      </div>
      {sp.from && <p className="mt-1 pl-11 text-sm text-muted">Showing {data.category.name.toLowerCase()} for &ldquo;{sp.from}&rdquo;</p>}

      <nav className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Other categories">
        {categories.map((c) => (
          <Link key={c.id} href={`/c/${c.slug}`} aria-current={c.slug === slug ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${c.slug === slug ? "bg-ink-soft text-ink" : "text-muted hover:text-graphite"}`}>
            {c.name}
          </Link>
        ))}
      </nav>

      <FilteredGrid cards={data.products} highlightId={sp.highlight} />
    </div>
  );
}
