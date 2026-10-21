import Link from "next/link";
import { Plus, CheckCircle2 } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { ProductTable, type GroupRow } from "./ProductTable";

export const metadata = { title: "Products" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ saved?: string; new?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await getSessionProfile();
  const [groups, cats] = await Promise.all([
    supabase.from("product_groups").select("id, name, slug, category_id, sold_count, products(id, sku, variant_label, price_paise, mrp_paise, stock, low_stock_at, active, images, sort)").order("name"),
    supabase.from("categories").select("id, name").order("sort"),
  ]);
  const saved = sp.saved ? (groups.data ?? []).find((g) => g.id === sp.saved) as { id: string; name: string; slug: string } | undefined : undefined;
  return (
    <div className="max-w-6xl">
      {saved && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-ok/30 bg-ok/10 p-3 text-sm" role="status">
          <CheckCircle2 className="size-5 text-ok" />
          <p className="font-semibold">{saved.name} {sp.new === "1" ? "created" : "saved"}. It&apos;s live in the shop now.</p>
          <span className="ml-auto flex gap-2">
            <Link href={`/p/${saved.slug}`} target="_blank" className="rounded-lg border border-ink px-3 py-1.5 font-semibold text-ink">View in shop</Link>
            <Link href={`/admin/products/${saved.id}`} className="rounded-lg px-3 py-1.5 font-semibold text-ink hover:bg-ink-soft">Edit again</Link>
          </span>
        </div>
      )}
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
