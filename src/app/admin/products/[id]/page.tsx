import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { ProductEditor, type EditGroup } from "./ProductEditor";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await getSessionProfile();
  const [group, cats] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) :
      supabase.from("product_groups").select("id, name, slug, description, category_id, brand, tags, returnable, seasonal_tag, products(*)").eq("id", id).single(),
    supabase.from("categories").select("id, name").order("sort"),
  ]);
  if (!isNew && !group.data) notFound();
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2">
        <Link href="/admin/products" className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label="All products"><ChevronLeft className="size-5" /></Link>
        <h1 className="text-2xl font-extrabold">{isNew ? "New product" : group.data!.name}</h1>
        {!isNew && <Link href={`/p/${group.data!.slug}`} target="_blank" className="ml-auto text-sm font-semibold text-ink hover:underline">View in shop</Link>}
      </div>
      <ProductEditor initial={(group.data as unknown as EditGroup) ?? null} categories={cats.data ?? []} />
    </div>
  );
}
