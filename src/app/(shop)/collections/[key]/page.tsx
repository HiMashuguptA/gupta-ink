import { notFound } from "next/navigation";
import { COLLECTIONS, getCollection } from "@/lib/catalog";
import { FilteredGrid } from "@/components/shop/FilteredGrid";

export const revalidate = 300;
export function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((key) => ({ key }));
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: COLLECTIONS[key]?.title ?? "Collection" };
}

export default async function CollectionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const c = COLLECTIONS[key];
  if (!c) notFound();
  const cards = await getCollection(key, 100);
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-2xl font-extrabold">{c.title}</h1>
      <FilteredGrid cards={cards} showCategoryFilter />
    </div>
  );
}
