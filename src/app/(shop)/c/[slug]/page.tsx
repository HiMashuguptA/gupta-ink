import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCategories, getCategoryProducts } from "@/lib/catalog";
import { UrlFilteredGrid } from "@/components/shop/FilteredGrid";

export const revalidate = 300;
export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cats = await getCategories();
  return { title: cats.find((c) => c.slug === slug)?.name ?? "Category" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, categories] = await Promise.all([getCategoryProducts(slug), getCategories()]);
  if (!data) notFound();

  return (
    <div className="px-4 pt-4">
      {/* Aisle sign: the category painted on its own board */}
      <div className="keyline relative flex min-h-[112px] items-center overflow-hidden rounded-[14px] bg-sign py-4 pl-3 pr-28 text-on-sign" style={{ "--keyline": "rgb(245 184 0 / 0.5)", "--shade": "#04261d" } as React.CSSProperties}>
        <Link href="/categories" className="press mr-2 grid size-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="All categories"><ChevronLeft className="size-5" /></Link>
        <div className="min-w-0">
          <h1 className="sign-type sign-shade text-[40px] text-on-sign">{data.category.name}</h1>
          <p className="num mt-1 text-sm text-on-sign-muted">{data.products.length} {data.products.length === 1 ? "product" : "products"} on the shelf</p>
        </div>
        {data.category.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.category.image_url} alt="" className="absolute -right-3 top-1/2 size-32 -translate-y-1/2 rotate-[-6deg] rounded-[14px]" />
        )}
      </div>

      <nav className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-3" aria-label="Other categories">
        {categories.map((c) => (
          <Link key={c.id} href={`/c/${c.slug}`} aria-current={c.slug === slug ? "page" : undefined}
            className={`press shrink-0 rounded-[9px] px-3.5 py-2 text-sm font-semibold ${c.slug === slug ? "bg-ink text-on-ink" : "bg-card text-graphite hover:bg-sunk"}`}>
            {c.name}
          </Link>
        ))}
      </nav>

      <UrlFilteredGrid cards={data.products} categoryName={data.category.name} />
    </div>
  );
}
