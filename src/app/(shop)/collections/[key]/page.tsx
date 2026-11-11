import { notFound } from "next/navigation";
import { COLLECTIONS, getCollection } from "@/lib/catalog";
import { FilteredGrid } from "@/components/shop/FilteredGrid";

export const revalidate = 300;
// Built on first visit, then cached for 5 minutes (keeps builds independent of the database)
export function generateStaticParams() {
  return [] as { key: string }[];
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const c = COLLECTIONS[key];
  if (!c) return { title: "Collection" };
  return {
    title: `${c.title}: stationery in Kohima`,
    description: `${c.title} at Gupta Enterprises, Kohima. Notebooks, pens, office and exam supplies delivered in 45-60 minutes or ready for pickup.`,
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
