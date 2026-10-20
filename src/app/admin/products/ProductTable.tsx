"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Pencil, Search } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";
import { refreshCatalog } from "@/app/actions/admin";

type Variant = { id: string; sku: string; variant_label: string | null; price_paise: number; mrp_paise: number; stock: number; low_stock_at: number; active: boolean; images: string[]; sort: number };
export type GroupRow = { id: string; name: string; slug: string; category_id: string; sold_count: number; products: Variant[] };

export function ProductTable({ groups, categories }: { groups: GroupRow[]; categories: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [only, setOnly] = useState<"all" | "low" | "hidden">("all");
  const [rows, setRows] = useState(groups);
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((g) => (!cat || g.category_id === cat)
      && (!t || g.name.toLowerCase().includes(t) || g.products.some((p) => p.sku.toLowerCase().includes(t) || (p.variant_label ?? "").toLowerCase().includes(t)))
      && (only === "all" || (only === "low" ? g.products.some((p) => p.active && p.stock <= p.low_stock_at) : g.products.some((p) => !p.active))));
  }, [rows, q, cat, only]);

  const patch = async (v: Variant, change: Partial<Variant>) => {
    setSaving(v.id); setErr(null);
    const { error } = await supabaseBrowser().from("products").update(change).eq("id", v.id);
    setSaving(null);
    if (error) return setErr(error.message.includes("check") ? "Price can't be above MRP, and stock can't be negative." : error.message);
    setRows((all) => all.map((g) => ({ ...g, products: g.products.map((p) => (p.id === v.id ? { ...p, ...change } : p)) })));
    void refreshCatalog();
  };

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or variant" aria-label="Search products"
            className="h-10 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-sm outline-none focus:border-ink" />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className="h-10 rounded-xl border border-line bg-card px-3 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(["all", "low", "hidden"] as const).map((k) => (
          <button key={k} onClick={() => setOnly(k)} aria-pressed={only === k}
            className={clsx("h-10 rounded-full border px-3.5 text-sm font-semibold", only === k ? "border-ink bg-ink text-white" : "border-line bg-card")}>
            {k === "all" ? "All" : k === "low" ? "Low stock" : "Hidden"}
          </button>
        ))}
      </div>
      {err && <p className="mt-3 text-sm font-semibold text-margin" role="alert">{err}</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="text-left text-muted">
            <th className="p-3 font-semibold">Product</th><th className="p-3 font-semibold">Variant / SKU</th><th className="p-3 text-right font-semibold">Price</th>
            <th className="p-3 font-semibold">Stock</th><th className="p-3 font-semibold">On sale</th><th className="p-3" />
          </tr></thead>
          <tbody>
            {shown.map((g) => [...g.products].sort((a, b) => a.sort - b.sort).map((p, i) => (
              <tr key={p.id} className={clsx(i === 0 ? "border-t border-line" : "", !p.active && "opacity-60")}>
                {i === 0 && (
                  <td className="p-3 align-top" rowSpan={g.products.length}>
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.images[0] ?? "/brand/logo.svg"} alt="" className="size-11 rounded-lg" />
                      <div><p className="font-semibold">{g.name}</p><p className="text-xs text-muted">{catName[g.category_id] ?? ""} · {g.sold_count} sold</p></div>
                    </div>
                  </td>
                )}
                <td className="p-3"><span className="font-semibold">{p.variant_label ?? "Standard"}</span><span className="block font-mono text-xs text-muted">{p.sku}</span></td>
                <td className="p-3 text-right tabular-nums">{rupees(p.price_paise)}{p.mrp_paise > p.price_paise && <span className="block text-xs text-muted line-through">{rupees(p.mrp_paise)}</span>}</td>
                <td className="p-3">
                  <input type="number" min={0} defaultValue={p.stock} aria-label={`Stock for ${g.name} ${p.variant_label ?? ""}`}
                    onBlur={(e) => { const n = Math.max(0, Math.floor(Number(e.target.value) || 0)); if (n !== p.stock) void patch(p, { stock: n }); }}
                    className={clsx("h-9 w-20 rounded-lg border bg-paper px-2 tabular-nums outline-none focus:border-ink", p.stock <= p.low_stock_at ? "border-margin/50 text-margin" : "border-line")} />
                  {saving === p.id && <span className="ml-2 text-xs text-muted">Saving…</span>}
                </td>
                <td className="p-3">
                  <button role="switch" aria-checked={p.active} onClick={() => patch(p, { active: !p.active })} aria-label={`${p.sku} on sale`}
                    className={clsx("relative h-6 w-11 rounded-full transition-colors", p.active ? "bg-ok" : "bg-line")}>
                    <span className={clsx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", p.active ? "left-[22px]" : "left-0.5")} />
                  </button>
                </td>
                {i === 0 && (
                  <td className="p-3 text-right align-top" rowSpan={g.products.length}>
                    <Link href={`/admin/products/${g.id}`} className="inline-grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label={`Edit ${g.name}`}><Pencil className="size-4" /></Link>
                  </td>
                )}
              </tr>
            )))}
          </tbody>
        </table>
        {!shown.length && <p className="p-6 text-center text-sm text-muted">No products match.</p>}
      </div>
      <p className="mt-2 text-xs text-muted">{shown.length} of {rows.length} products. Stock saves when you leave the box. Shop pages update within a minute.</p>
    </div>
  );
}
