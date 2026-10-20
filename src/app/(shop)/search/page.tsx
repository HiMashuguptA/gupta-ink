import Link from "next/link";
import { searchCatalog, getCategories } from "@/lib/catalog";
import { FilteredGrid } from "@/components/shop/FilteredGrid";
import { Rail } from "@/components/shop/Rail";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 80);
  if (term.length < 2) {
    return <div className="px-4 pt-6"><h1 className="text-xl font-bold">Type at least two letters to search</h1></div>;
  }
  const { matches, related } = await searchCatalog(term);

  if (!matches.length) {
    const categories = await getCategories();
    return (
      <div className="px-4 pt-6">
        <div className="ruled rounded-3xl p-6 pl-14">
          <h1 className="text-xl font-bold">No results for &ldquo;{term}&rdquo;</h1>
          <p className="mt-1 text-muted">Check the spelling, try a shorter word, or browse a category. We&apos;ve noted the search so the store can stock it.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="rounded-full border border-line bg-card px-3.5 py-2 text-sm font-semibold hover:border-ink/40">{c.name}</Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="px-4">
        <h1 className="text-xl font-bold">Results for &ldquo;{term}&rdquo;</h1>
        <div className="mt-3"><FilteredGrid cards={matches} showCategoryFilter /></div>
      </div>
      <Rail title={`More in ${matches[0].category_name}`} href={`/c/${matches[0].category_slug}`} cards={related} />
    </div>
  );
}
