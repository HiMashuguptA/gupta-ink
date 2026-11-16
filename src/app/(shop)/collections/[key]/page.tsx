import { notFound } from "next/navigation";
import { COLLECTIONS, getCollection } from "@/lib/catalog";
import { FilteredGrid } from "@/components/shop/FilteredGrid";
import { BRAND, NOT_FOUND } from "@/lib/seo";

// Built with the deploy (see the product page for why), refreshed every 5 minutes
export const revalidate = 300;
export function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((key) => ({ key }));
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const c = COLLECTIONS[key];
  if (!c) return NOT_FOUND;
  return {
    title: c.seo,
    description: `${c.seo} from ${BRAND}: notebooks, pens and office supplies, delivered in 45-60 minutes or ready for pickup.`,
    alternates: { canonical: `/collections/${key}` },
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const c = COLLECTIONS[key];
  if (!c) notFound();
  const cards = await getCollection(key, 100);
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 t-h1 uppercase">{c.title}</h1>
      <FilteredGrid cards={cards} showCategoryFilter />
    </div>
  );
}
