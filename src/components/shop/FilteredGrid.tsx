"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X, Check } from "lucide-react";
import clsx from "clsx";
import type { GroupCard } from "@/lib/types";
import { Grid } from "./Rail";

type Sort = "relevance" | "price_asc" | "price_desc" | "rating" | "discount" | "newest";
const SORTS: { key: Sort; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "rating", label: "Customer rating" },
  { key: "discount", label: "Biggest discount" },
  { key: "newest", label: "Newest" },
];
const PRICE_BANDS = [
  { key: "u50", label: "Under ₹50", min: 0, max: 4999 },
  { key: "50-100", label: "₹50 to ₹100", min: 5000, max: 10000 },
  { key: "100-300", label: "₹100 to ₹300", min: 10001, max: 30000 },
  { key: "o300", label: "Over ₹300", min: 30001, max: Infinity },
];

type Filters = { brands: string[]; colours: string[]; price: string[]; rating4: boolean; discount: boolean; inStock: boolean; categories: string[] };
const EMPTY: Filters = { brands: [], colours: [], price: [], rating4: false, discount: false, inStock: false, categories: [] };

export function FilteredGrid({ cards, highlightId, showCategoryFilter = false }: { cards: GroupCard[]; highlightId?: string; showCategoryFilter?: boolean }) {
  const [sort, setSort] = useState<Sort>("relevance");
  const [f, setF] = useState<Filters>(EMPTY);
  const [open, setOpen] = useState(false);

  const facets = useMemo(() => {
    const brands = [...new Set(cards.map((c) => c.brand).filter(Boolean) as string[])].sort();
    const colours = [...new Set(cards.flatMap((c) => c.variants.map((v) => v.colour)).filter(Boolean) as string[])].sort();
    const categories = [...new Map(cards.map((c) => [c.category_slug, c.category_name])).entries()];
    return { brands, colours, categories };
  }, [cards]);

  const result = useMemo(() => {
    let r = cards.filter((c) => {
      if (f.brands.length && !f.brands.includes(c.brand ?? "")) return false;
      if (f.colours.length && !c.variants.some((v) => v.colour && f.colours.includes(v.colour))) return false;
      if (f.categories.length && !f.categories.includes(c.category_slug)) return false;
      if (f.price.length && !f.price.some((k) => {
        const b = PRICE_BANDS.find((x) => x.key === k)!;
        return c.variants.some((v) => v.price_paise >= b.min && v.price_paise <= b.max);
      })) return false;
      if (f.rating4 && Number(c.rating_avg) < 4) return false;
      if (f.discount && c.discount_pct < 10) return false;
      if (f.inStock && !c.variants.some((v) => v.stock > 0)) return false;
      return true;
    });
    const by: Record<Sort, (a: GroupCard, b: GroupCard) => number> = {
      relevance: () => 0,
      price_asc: (a, b) => a.price_paise - b.price_paise,
      price_desc: (a, b) => b.price_paise - a.price_paise,
      rating: (a, b) => Number(b.rating_avg) - Number(a.rating_avg),
      discount: (a, b) => b.discount_pct - a.discount_pct,
      newest: (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    };
    r = [...r].sort(by[sort]);
    // Keep the product picked from the search bar at the front
    if (highlightId) r.sort((a, b) => Number(b.group_id === highlightId) - Number(a.group_id === highlightId));
    return r;
  }, [cards, f, sort, highlightId]);

  const active = f.brands.length + f.colours.length + f.price.length + f.categories.length + Number(f.rating4) + Number(f.discount) + Number(f.inStock);
  const toggle = (key: "brands" | "colours" | "price" | "categories", v: string) =>
    setF((s) => ({ ...s, [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] }));

  const chip = (on: boolean, label: string, onClick: () => void, key: string) => (
    <button key={key} type="button" onClick={onClick} aria-pressed={on}
      className={clsx("inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3.5 text-sm font-semibold transition-colors",
        on ? "border-ink bg-ink text-white" : "border-line bg-card text-graphite hover:border-ink/40")}>
      {on && <Check className="size-3.5" />}{label}
    </button>
  );

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 text-sm font-semibold">
          <SlidersHorizontal className="size-4" /> Filters{active > 0 && <span className="grid size-5 place-items-center rounded-full bg-nib text-[11px] text-ink-deep">{active}</span>}
        </button>
        <label className="relative inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-card pl-3.5 pr-2 text-sm font-semibold">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent pr-1 outline-none">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        {chip(f.inStock, "In stock", () => setF((s) => ({ ...s, inStock: !s.inStock })), "stock")}
        {chip(f.rating4, "4★ and above", () => setF((s) => ({ ...s, rating4: !s.rating4 })), "r4")}
        {chip(f.discount, "10% off or more", () => setF((s) => ({ ...s, discount: !s.discount })), "disc")}
        {PRICE_BANDS.slice(0, 2).map((b) => chip(f.price.includes(b.key), b.label, () => toggle("price", b.key), b.key))}
      </div>

      <p className="mb-3 text-sm text-muted">{result.length} {result.length === 1 ? "product" : "products"}</p>

      {result.length ? (
        <Grid cards={result} highlightId={highlightId} />
      ) : (
        <div className="ruled rounded-3xl p-8 pl-14">
          <h3 className="text-lg font-bold">Nothing matches these filters</h3>
          <p className="mt-1 text-muted">Remove a filter or two to see more products.</p>
          <button onClick={() => setF(EMPTY)} className="mt-4 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Clear all filters</button>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-deep/40 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby="filters-title" onClick={(e) => e.stopPropagation()}
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl bg-card sm:rounded-3xl">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 id="filters-title" className="text-lg font-bold">Filters</h2>
                <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-paper" aria-label="Close filters"><X className="size-5" /></button>
              </div>
              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                {showCategoryFilter && facets.categories.length > 1 && (
                  <fieldset><legend className="mb-2 text-sm font-bold">Category</legend>
                    <div className="flex flex-wrap gap-2">{facets.categories.map(([slug, name]) => chip(f.categories.includes(slug), name, () => toggle("categories", slug), slug))}</div>
                  </fieldset>
                )}
                <fieldset><legend className="mb-2 text-sm font-bold">Price</legend>
                  <div className="flex flex-wrap gap-2">{PRICE_BANDS.map((b) => chip(f.price.includes(b.key), b.label, () => toggle("price", b.key), b.key))}</div>
                </fieldset>
                {facets.brands.length > 0 && (
                  <fieldset><legend className="mb-2 text-sm font-bold">Brand</legend>
                    <div className="flex flex-wrap gap-2">{facets.brands.map((b) => chip(f.brands.includes(b), b, () => toggle("brands", b), b))}</div>
                  </fieldset>
                )}
                {facets.colours.length > 0 && (
                  <fieldset><legend className="mb-2 text-sm font-bold">Colour</legend>
                    <div className="flex flex-wrap gap-2">{facets.colours.map((c) => chip(f.colours.includes(c), c, () => toggle("colours", c), c))}</div>
                  </fieldset>
                )}
                <fieldset><legend className="mb-2 text-sm font-bold">More</legend>
                  <div className="flex flex-wrap gap-2">
                    {chip(f.inStock, "In stock", () => setF((s) => ({ ...s, inStock: !s.inStock })), "s")}
                    {chip(f.rating4, "4★ and above", () => setF((s) => ({ ...s, rating4: !s.rating4 })), "r")}
                    {chip(f.discount, "10% off or more", () => setF((s) => ({ ...s, discount: !s.discount })), "d")}
                  </div>
                </fieldset>
              </div>
              <div className="flex gap-3 border-t border-line p-4">
                <button onClick={() => setF(EMPTY)} className="h-12 flex-1 rounded-xl border border-line font-semibold">Clear all</button>
                <button onClick={() => setOpen(false)} className="h-12 flex-[2] rounded-xl bg-ink font-semibold text-white">Show {result.length} products</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">{result.length} products shown{active ? `, ${active} filters on` : ""}</span>
    </div>
  );
}
