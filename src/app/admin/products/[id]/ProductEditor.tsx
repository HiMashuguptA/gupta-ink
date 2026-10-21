"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, Trash2, ArrowLeft, ArrowRight, ImagePlus, Copy } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { slugify, storageUrl } from "@/lib/format";
import { uploadPhoto } from "@/lib/upload";
import { refreshCatalog } from "@/app/actions/admin";
import { TagInput } from "./TagInput";

type DbVariant = {
  id: string; sku: string; variant_label: string | null; colour: string | null; colour_hex: string | null; unit: string; images: string[];
  mrp_paise: number; price_paise: number; gst_rate: number; hsn: string | null; stock: number; low_stock_at: number; max_per_order: number;
  featured: boolean; active: boolean; sort: number;
};
export type EditGroup = { id: string; name: string; slug: string; description: string | null; category_id: string; brand: string | null; tags: string[];
  returnable: boolean; seasonal_tag: string | null; products: DbVariant[] };

type V = { id?: string; key: string; sku: string; label: string; colour: string; hex: string; unit: string; images: string[]; mrp: string; price: string;
  gst: string; hsn: string; stock: string; low: string; maxPer: string; featured: boolean; active: boolean };

const toV = (p: DbVariant): V => ({ id: p.id, key: p.id, sku: p.sku, label: p.variant_label ?? "", colour: p.colour ?? "", hex: p.colour_hex ?? "", unit: p.unit,
  images: p.images, mrp: String(p.mrp_paise / 100), price: String(p.price_paise / 100), gst: String(p.gst_rate), hsn: p.hsn ?? "", stock: String(p.stock),
  low: String(p.low_stock_at), maxPer: String(p.max_per_order), featured: p.featured, active: p.active });
const newV = (base?: V): V => ({ key: crypto.randomUUID(), sku: "", label: "", colour: "", hex: "", unit: base?.unit ?? "piece", images: base ? [...base.images] : [],
  mrp: base?.mrp ?? "", price: base?.price ?? "", gst: base?.gst ?? "18", hsn: base?.hsn ?? "", stock: "0", low: base?.low ?? "5", maxPer: base?.maxPer ?? "20", featured: false, active: true });

export function ProductEditor({ initial, categories: initialCats, allTags }: { initial: EditGroup | null; categories: { id: string; name: string }[]; allTags: string[] }) {
  const router = useRouter();
  const sb = supabaseBrowser();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [categories, setCategories] = useState(initialCats);
  const [category, setCategory] = useState(initial?.category_id ?? initialCats[0]?.id ?? "");
  const [newCat, setNewCat] = useState<string | null>(null);
  const [catBusy, setCatBusy] = useState(false);
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [seasonal, setSeasonal] = useState(initial?.seasonal_tag ?? "");
  const [returnable, setReturnable] = useState(initial?.returnable ?? true);
  const [variants, setVariants] = useState<V[]>(initial ? [...initial.products].sort((a, b) => a.sort - b.sort).map(toV) : [newV()]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setV = (key: string, change: Partial<V>) => setVariants((all) => all.map((v) => (v.key === key ? { ...v, ...change } : v)));
  const field = "mt-1 h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:border-ink";

  const addImages = async (v: V, picked: File[]) => {
    if (!picked.length) return;
    setUploading(v.key); setMsg(null);
    // Upload one by one so a bad file doesn't stop the others; keep the good ones
    const urls: string[] = []; const failed: string[] = [];
    for (const f of picked.slice(0, Math.max(0, 6 - v.images.length))) {
      try { urls.push(storageUrl("products", await uploadPhoto("products", "catalogue", f))); }
      catch (e) { failed.push((e as Error).message); }
    }
    setVariants((all) => all.map((x) => (x.key === v.key ? { ...x, images: [...x.images, ...urls].slice(0, 6) } : x)));
    setUploading(null);
    if (failed.length) setMsg({ ok: false, text: failed.join(" ") });
    else if (urls.length) setMsg({ ok: true, text: `${urls.length} photo${urls.length === 1 ? "" : "s"} added. Save to keep them.` });
  };
  const moveImage = (v: V, i: number, dir: -1 | 1) => {
    const imgs = [...v.images]; const j = i + dir;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    setV(v.key, { images: imgs });
  };

  const createCategory = async () => {
    const nm = (newCat ?? "").trim();
    if (!nm) return;
    const existing = categories.find((c) => c.name.toLowerCase() === nm.toLowerCase());
    if (existing) { setCategory(existing.id); setNewCat(null); return; }
    setCatBusy(true); setMsg(null);
    const { data, error } = await sb.from("categories").insert({ name: nm, slug: slugify(nm), sort: categories.length + 1, active: true }).select("id, name").single();
    setCatBusy(false);
    if (error) return setMsg({ ok: false, text: error.code === "23505" ? "A category with a similar web address exists. Pick it from the list." : error.message });
    setCategories((c) => [...c, data]);
    setCategory(data.id);
    setNewCat(null);
    void refreshCatalog();
    setMsg({ ok: true, text: `Category "${data.name}" created.` });
  };

  const save = async () => {
    setMsg(null);
    const s = slugify(slug || name);
    if (!name.trim()) return setMsg({ ok: false, text: "Add a product name" });
    if (!s) return setMsg({ ok: false, text: "Add a web address (slug)" });
    for (const [i, v] of variants.entries()) {
      const n = `Variant ${i + 1}`;
      if (!/^[A-Z0-9-]{3,40}$/.test(v.sku.trim().toUpperCase())) return setMsg({ ok: false, text: `${n}: SKU must be 3 to 40 letters, numbers or dashes` });
      const mrp = Number(v.mrp), price = Number(v.price);
      if (!(mrp > 0) || !(price > 0)) return setMsg({ ok: false, text: `${n}: add the price and MRP` });
      if (price > mrp) return setMsg({ ok: false, text: `${n}: price can't be more than MRP` });
      if (variants.length > 1 && !v.label.trim()) return setMsg({ ok: false, text: `${n}: name the variant (for example Blue, or Pack of 10)` });
    }
    setBusy(true);
    try {
      const g = { name: name.trim(), slug: s, category_id: category, brand: brand.trim() || null, description: description.trim() || null,
        tags, seasonal_tag: seasonal.trim() || null, returnable };
      let gid = initial?.id;
      if (gid) {
        const { error } = await sb.from("product_groups").update(g).eq("id", gid);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("product_groups").insert(g).select("id").single();
        if (error) throw error;
        gid = data.id;
      }
      for (const [i, v] of variants.entries()) {
        const row = { group_id: gid!, sku: v.sku.trim().toUpperCase(), variant_label: v.label.trim() || null, colour: v.colour.trim() || null,
          colour_hex: /^#[0-9a-f]{6}$/i.test(v.hex) ? v.hex : null, unit: v.unit.trim() || "piece", images: v.images,
          mrp_paise: Math.round(Number(v.mrp) * 100), price_paise: Math.round(Number(v.price) * 100), gst_rate: Number(v.gst) || 0, hsn: v.hsn.trim() || null,
          stock: Math.max(0, Math.floor(Number(v.stock) || 0)), low_stock_at: Math.max(0, Math.floor(Number(v.low) || 0)),
          max_per_order: Math.max(1, Math.floor(Number(v.maxPer) || 1)), featured: v.featured, active: v.active, sort: i };
        const { error } = v.id ? await sb.from("products").update(row).eq("id", v.id) : await sb.from("products").insert(row);
        if (error) throw error;
      }
      await refreshCatalog();
      // Back to the product list, which confirms the save and links to the shop page
      router.push(`/admin/products?saved=${gid}&new=${initial ? 0 : 1}`);
      router.refresh();
      return;
    } catch (e) {
      const err = e as { code?: string; message: string };
      setMsg({ ok: false, text: err.code === "23505" ? (err.message.includes("slug") ? "Another product already uses that web address" : "Another product already uses that SKU") : err.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-5 space-y-5 pb-24">
      <section className="grid gap-3 rounded-2xl border border-line bg-card p-4 text-sm sm:grid-cols-2">
        <label className="font-semibold sm:col-span-2">Product name
          <input value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} className={field} placeholder="Gel Pen 0.5 mm" />
        </label>
        <label className="font-semibold">Web address
          <div className="mt-1 flex items-center rounded-lg border border-line bg-paper focus-within:border-ink">
            <span className="pl-3 text-muted">/p/</span>
            <input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} className="h-10 min-w-0 flex-1 bg-transparent pr-3 outline-none" />
          </div>
        </label>
        <div className="font-semibold">
          <label htmlFor="cat">Category</label>
          {newCat === null ? (
            <div className="mt-1 flex gap-2">
              <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:border-ink">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" onClick={() => setNewCat("")} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-dashed border-ink px-3 text-sm font-semibold text-ink"><Plus className="size-4" /> New</button>
            </div>
          ) : (
            <div className="mt-1 flex gap-2">
              <input autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name" aria-label="New category name"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createCategory(); } if (e.key === "Escape") setNewCat(null); }}
                className="h-10 min-w-0 flex-1 rounded-lg border border-ink bg-paper px-3 text-sm outline-none" />
              <button type="button" disabled={catBusy || !newCat.trim()} onClick={createCategory} className="h-10 shrink-0 rounded-lg bg-ink px-3 text-sm font-semibold text-white disabled:opacity-50">{catBusy ? "Adding…" : "Add"}</button>
              <button type="button" onClick={() => setNewCat(null)} className="h-10 shrink-0 rounded-lg px-2 text-sm font-semibold text-muted">Cancel</button>
            </div>
          )}
        </div>
        <label className="font-semibold">Brand (optional)<input value={brand} onChange={(e) => setBrand(e.target.value)} className={field} /></label>
        <label className="font-semibold">Season tag (optional)<input value={seasonal} onChange={(e) => setSeasonal(e.target.value)} className={field} placeholder="monsoon, back-to-school" /></label>
        <label className="font-semibold sm:col-span-2">Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-line bg-paper p-3 outline-none focus:border-ink" />
        </label>
        <div className="font-semibold sm:col-span-2">
          <label htmlFor="tags">Tags <span className="font-normal text-muted">(help customers find it in search; pick existing ones or create new)</span></label>
          <TagInput id="tags" value={tags} onChange={setTags} suggestions={allTags} />
        </div>
        <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={returnable} onChange={(e) => setReturnable(e.target.checked)} className="size-4 accent-[var(--ink)]" /> Customers can return this</label>
      </section>

      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Variants</h2>
        <span className="text-sm text-muted">Colours, sizes or pack sizes. Each has its own price, stock and photos.</span>
      </div>
      {variants.map((v, i) => (
        <section key={v.key} className={clsx("rounded-2xl border bg-card p-4 text-sm", v.active ? "border-line" : "border-dashed border-line opacity-80")}>
          <div className="flex items-center gap-2">
            <p className="font-bold">{v.label || `Variant ${i + 1}`}</p>
            {!v.active && <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-muted">Hidden</span>}
            <button type="button" onClick={() => setVariants((all) => [...all, { ...newV(v), label: "" }])} className="ml-auto inline-flex h-8 items-center gap-1 rounded-full px-2.5 font-semibold text-ink hover:bg-ink-soft"><Copy className="size-3.5" /> Copy</button>
            {!v.id && variants.length > 1 && <button type="button" onClick={() => setVariants((all) => all.filter((x) => x.key !== v.key))} className="grid size-8 place-items-center rounded-full text-margin hover:bg-margin/10" aria-label="Remove variant"><Trash2 className="size-4" /></button>}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="font-semibold sm:col-span-2">Variant name<input value={v.label} onChange={(e) => setV(v.key, { label: e.target.value })} className={field} placeholder="Blue, or Pack of 10" /></label>
            <label className="font-semibold sm:col-span-2">SKU<input value={v.sku} onChange={(e) => setV(v.key, { sku: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} className={`${field} font-mono`} placeholder="GI-GELPEN-BLUE" /></label>
            <label className="font-semibold">Price ₹<input inputMode="decimal" value={v.price} onChange={(e) => setV(v.key, { price: e.target.value.replace(/[^\d.]/g, "") })} className={field} /></label>
            <label className="font-semibold">MRP ₹<input inputMode="decimal" value={v.mrp} onChange={(e) => setV(v.key, { mrp: e.target.value.replace(/[^\d.]/g, "") })} className={field} /></label>
            <label className="font-semibold">Stock<input inputMode="numeric" value={v.stock} onChange={(e) => setV(v.key, { stock: e.target.value.replace(/\D/g, "") })} className={field} /></label>
            <label className="font-semibold">Low stock alert at<input inputMode="numeric" value={v.low} onChange={(e) => setV(v.key, { low: e.target.value.replace(/\D/g, "") })} className={field} /></label>
            <label className="font-semibold">Max per order<input inputMode="numeric" value={v.maxPer} onChange={(e) => setV(v.key, { maxPer: e.target.value.replace(/\D/g, "") })} className={field} /></label>
            <label className="font-semibold">Unit<input value={v.unit} onChange={(e) => setV(v.key, { unit: e.target.value })} className={field} placeholder="piece, pack, ream" /></label>
            <label className="font-semibold">GST %<input inputMode="decimal" value={v.gst} onChange={(e) => setV(v.key, { gst: e.target.value.replace(/[^\d.]/g, "") })} className={field} /></label>
            <label className="font-semibold">HSN<input value={v.hsn} onChange={(e) => setV(v.key, { hsn: e.target.value.replace(/\D/g, "").slice(0, 8) })} className={field} /></label>
            <label className="font-semibold">Colour name<input value={v.colour} onChange={(e) => setV(v.key, { colour: e.target.value })} className={field} placeholder="Optional" /></label>
            <label className="font-semibold">Colour swatch
              <div className="mt-1 flex items-center gap-2">
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(v.hex) ? v.hex : "#1f2a6e"} onChange={(e) => setV(v.key, { hex: e.target.value })} className="h-10 w-12 rounded-lg border border-line" aria-label="Pick colour" />
                {v.hex ? <button type="button" onClick={() => setV(v.key, { hex: "" })} className="text-xs font-semibold text-muted">Clear</button> : <span className="text-xs text-muted">None</span>}
              </div>
            </label>
          </div>

          <p className="mt-4 font-semibold">Photos <span className="font-normal text-muted">(first one is the main photo)</span></p>
          <div className="mt-2 flex flex-wrap gap-2">
            {v.images.map((src, k) => (
              <div key={src + k} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Photo ${k + 1}`} className={clsx("size-24 rounded-xl border object-cover", k === 0 ? "border-ink" : "border-line")} />
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button type="button" onClick={() => moveImage(v, k, -1)} disabled={k === 0} className="grid size-6 place-items-center rounded-full bg-card/90 disabled:opacity-0" aria-label="Move left"><ArrowLeft className="size-3.5" /></button>
                  <button type="button" onClick={() => setV(v.key, { images: v.images.filter((_, x) => x !== k) })} className="grid size-6 place-items-center rounded-full bg-card/90 text-margin" aria-label="Remove photo"><Trash2 className="size-3.5" /></button>
                  <button type="button" onClick={() => moveImage(v, k, 1)} disabled={k === v.images.length - 1} className="grid size-6 place-items-center rounded-full bg-card/90 disabled:opacity-0" aria-label="Move right"><ArrowRight className="size-3.5" /></button>
                </div>
              </div>
            ))}
            {v.images.length < 6 && (
              <label className="grid size-24 cursor-pointer place-items-center rounded-xl border-[1.5px] border-dashed border-line text-muted hover:border-ink hover:text-ink">
                <span className="grid justify-items-center gap-1 text-xs font-semibold"><ImagePlus className="size-5" />{uploading === v.key ? "Uploading…" : "Add photos"}</span>
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple hidden onChange={(e) => { const picked = Array.from(e.target.files ?? []); e.target.value = ""; void addImages(v, picked); }} />
              </label>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.active} onChange={(e) => setV(v.key, { active: e.target.checked })} className="size-4 accent-[var(--ink)]" /> On sale</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.featured} onChange={(e) => setV(v.key, { featured: e.target.checked })} className="size-4 accent-[var(--ink)]" /> Featured on home page</label>
          </div>
        </section>
      ))}
      <button type="button" onClick={() => setVariants((all) => [...all, newV(all[all.length - 1])])} className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-ink px-4 text-sm font-semibold text-ink"><Plus className="size-4" /> Add variant</button>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 p-3 backdrop-blur md:left-[220px]">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {msg && <p className={clsx("min-w-0 flex-1 text-sm font-semibold", msg.ok ? "text-ok" : "text-margin")} role="status">{msg.text}</p>}
          <button onClick={save} disabled={busy} className="ml-auto h-11 rounded-xl bg-ink px-6 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : initial ? "Save changes" : "Create product"}</button>
        </div>
      </div>
      <p className="text-xs text-muted">Variants that have been ordered can&apos;t be deleted; switch off &ldquo;On sale&rdquo; to hide them.</p>
    </div>
  );
}
