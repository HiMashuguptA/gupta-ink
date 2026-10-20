import Link from "next/link";
import { Plus } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { ProductTable, type GroupRow } from "./ProductTable";

export const metadata = { title: "Products" };

export default async function AdminProducts() {
  const { supabase } = await getSessionProfile();
  const [groups, cats] = await Promise.all([
    supabase.from("product_groups").select("id, name, slug, category_id, sold_count, products(id, sku, variant_label, price_paise, mrp_paise, stock, low_stock_at, active, images, sort)").order("name"),
    supabase.from("categories").select("id, name").order("sort"),
  ]);
  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Products</h1>
          <p className="mt-1 text-sm text-muted">Change stock and prices here; open a product to edit details, variants and photos.</p>
        </div>
        <Link href="/admin/products/new" className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white"><Plus className="size-4" /> New product</Link>
      </div>
      <ProductTable groups={(groups.data ?? []) as unknown as GroupRow[]} categories={cats.data ?? []} />
    </div>
  );
}
