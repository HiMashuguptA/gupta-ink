import { getSessionProfile } from "@/lib/supabase/server";
import { CategoryManager, type Cat } from "./CategoryManager";

export const metadata = { title: "Categories" };

export default async function AdminCategories() {
  const { supabase } = await getSessionProfile();
  const [cats, groups] = await Promise.all([
    supabase.from("categories").select("id, name, slug, sort, active").order("sort"),
    supabase.from("product_groups").select("category_id"),
  ]);
  const count: Record<string, number> = {};
  for (const g of groups.data ?? []) count[g.category_id] = (count[g.category_id] ?? 0) + 1;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold">Categories</h1>
      <p className="mt-1 text-sm text-muted">Shown on the home page and in the Categories tab, in this order. Hidden categories also hide their products.</p>
      <CategoryManager initial={(cats.data ?? []).map((c) => ({ ...c, products: count[c.id] ?? 0 })) as Cat[]} />
    </div>
  );
}
