"use client";
import { useSynced } from "@/lib/live";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { storageUrl } from "@/lib/format";
import { uploadPhoto } from "@/lib/upload";
import { refreshCatalog } from "@/app/actions/admin";
import { Sheet } from "@/components/ui/Sheet";

export type BannerRow = { id: string; title: string | null; subtitle: string | null; image_url: string; placement: "hero" | "promo" | "strip"; size: "full" | "half" | "compact";
  link_type: "product" | "category" | "search" | "featured" | "url"; link_value: string | null; bg_color: string | null; position: number; start_at: string | null; end_at: string | null; active: boolean };
export type SectionRow = { key: string; title: string; position: number; visible: boolean };

type Draft = Omit<BannerRow, "id" | "position"> & { id?: string };
const blank = (placement: BannerRow["placement"]): Draft => ({ title: "", subtitle: "", image_url: "", placement, size: placement === "hero" ? "full" : "half",
  link_type: "category", link_value: "", bg_color: null, start_at: null, end_at: null, active: true });
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);
const PLACES: { key: BannerRow["placement"]; label: string; hint: string }[] = [
  { key: "hero", label: "Top carousel", hint: "Wide banners that slide at the top. Best size 1600 × 700." },
  { key: "promo", label: "Promo tiles", hint: "Smaller tiles further down. Best size 800 × 600." },
];

export function HomeEditor({ banners: initialBanners, sections: initialSections, categories, products }: {
  banners: BannerRow[]; sections: SectionRow[]; categories: { slug: string; name: string }[]; products: { slug: string; name: string }[];
}) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [banners, setBanners] = useSynced(initialBanners);
  const [sections, setSections] = useSynced(initialSections);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const done = async () => { await refreshCatalog(); router.refresh(); };

  const moveBanner = async (b: BannerRow, dir: -1 | 1) => {
    const list = banners.filter((x) => x.placement === b.placement).sort((a, c) => a.position - c.position);
    const i = list.findIndex((x) => x.id === b.id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const updated = list.map((x, k) => ({ ...x, position: k }));
    setBanners((all) => [...all.filter((x) => x.placement !== b.placement), ...updated]);
    await Promise.all(updated.map((x) => sb.from("banners").update({ position: x.position }).eq("id", x.id)));
    void done();
  };
  const toggleBanner = async (b: BannerRow) => {
    setBanners((all) => all.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x)));
    await sb.from("banners").update({ active: !b.active }).eq("id", b.id);
    void done();
  };
  const removeBanner = async (b: BannerRow) => {
    if (!window.confirm(`Delete the banner "${b.title || "untitled"}"?`)) return;
    setBanners((all) => all.filter((x) => x.id !== b.id));
    await sb.from("banners").delete().eq("id", b.id);
    void done();
  };
  const saveDraft = async () => {
    if (!draft) return;
    setErr(null);
    if (!draft.image_url) return setErr("Add a picture");
    if (draft.link_type !== "featured" && !draft.link_value?.trim()) return setErr("Choose where the banner goes when tapped");
    if (draft.link_type === "url" && !draft.link_value!.startsWith("/")) return setErr("Links must be a page in this shop, starting with /");
    setBusy(true);
    const row = { ...draft, title: draft.title?.trim() || null, subtitle: draft.subtitle?.trim() || null, link_value: draft.link_type === "featured" ? null : draft.link_value!.trim() };
    const { id, ...rest } = row;
    const { error } = id ? await sb.from("banners").update(rest).eq("id", id)
      : await sb.from("banners").insert({ ...rest, position: banners.filter((b) => b.placement === draft.placement).length });
    setBusy(false);
    if (error) return setErr(error.message);
    setDraft(null);
    await done();
    const { data } = await sb.from("banners").select("*").order("position");
    if (data) setBanners(data as unknown as BannerRow[]);
  };
  const upload = async (f: File | undefined) => {
    if (!f || !draft) return;
    setBusy(true); setErr(null);
    try { const p = await uploadPhoto("banners", "home", f); setDraft({ ...draft, image_url: storageUrl("banners", p) }); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const moveSection = async (s: SectionRow, dir: -1 | 1) => {
    const list = [...sections].sort((a, b) => a.position - b.position);
    const i = list.findIndex((x) => x.key === s.key), j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const updated = list.map((x, k) => ({ ...x, position: k + 1 }));
    setSections(updated);
    await Promise.all(updated.map((x) => sb.from("home_sections").update({ position: x.position }).eq("key", x.key)));
    void done();
  };
  const patchSection = async (s: SectionRow, change: Partial<SectionRow>) => {
    setSections((all) => all.map((x) => (x.key === s.key ? { ...x, ...change } : x)));
    await sb.from("home_sections").update(change).eq("key", s.key);
    void done();
  };

  const field = "mt-1 h-10 w-full rounded-[8px] border border-line bg-paper px-3 text-sm outline-none focus:border-ink";
  return (
    <div className="mt-5 space-y-6">
      {PLACES.map((pl) => {
        const list = banners.filter((b) => b.placement === pl.key).sort((a, b) => a.position - b.position);
        return (
          <section key={pl.key}>
            <div className="flex items-center gap-2">
              <div><h2 className="text-[24px] uppercase">{pl.label}</h2><p className="text-xs text-muted">{pl.hint}</p></div>
              <button onClick={() => { setErr(null); setDraft(blank(pl.key)); }} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-ink px-3 text-sm font-semibold text-on-ink"><Plus className="size-4" /> Add</button>
            </div>
            <ul className={clsx("mt-3 grid gap-3", pl.key === "hero" ? "sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
              {list.map((b, i) => {
                const live = b.active && (!b.start_at || new Date(b.start_at) <= new Date()) && (!b.end_at || new Date(b.end_at) > new Date());
                return (
                  <li key={b.id} className={clsx("overflow-hidden rounded-[12px] border bg-card", live ? "border-line" : "border-dashed border-line opacity-70")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image_url} alt="" className={clsx("w-full object-cover", pl.key === "hero" ? "aspect-[16/7]" : "aspect-[4/3]")} />
                    <div className="p-3 text-sm">
                      <p className="truncate font-semibold">{b.title || "No title"}</p>
                      <p className="truncate text-xs text-muted">{live ? "Live" : !b.active ? "Off" : "Scheduled or ended"} · opens {b.link_type === "featured" ? "featured picks" : `${b.link_type} ${b.link_value ?? ""}`}</p>
                      <div className="mt-2 flex gap-1">
                        <button onClick={() => moveBanner(b, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-full hover:bg-ink-soft disabled:opacity-30" aria-label="Move earlier"><ArrowUp className="size-4" /></button>
                        <button onClick={() => moveBanner(b, 1)} disabled={i === list.length - 1} className="grid size-8 place-items-center rounded-full hover:bg-ink-soft disabled:opacity-30" aria-label="Move later"><ArrowDown className="size-4" /></button>
                        <button onClick={() => toggleBanner(b)} className="grid size-8 place-items-center rounded-full hover:bg-ink-soft" aria-label={b.active ? "Turn off" : "Turn on"}>{b.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
                        <button onClick={() => { setErr(null); setDraft({ ...b }); }} className="grid size-8 place-items-center rounded-full hover:bg-ink-soft" aria-label="Edit"><Pencil className="size-4" /></button>
                        <button onClick={() => removeBanner(b)} className="ml-auto grid size-8 place-items-center rounded-full text-margin hover:bg-margin/10" aria-label="Delete"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  </li>
                );
              })}
              {!list.length && <li className="rounded-[12px] border border-dashed border-line p-6 text-center text-sm text-muted">None yet.</li>}
            </ul>
          </section>
        );
      })}

      <section>
        <h2 className="text-[24px] uppercase">Sections</h2>
        <p className="text-xs text-muted">The rows on the home page, top to bottom. Rename them or hide the ones you don&apos;t want.</p>
        <ul className="mt-3 divide-y divide-line rounded-[12px] bg-card">
          {[...sections].sort((a, b) => a.position - b.position).map((s, i, arr) => (
            <li key={s.key} className={clsx("flex items-center gap-2 p-3", !s.visible && "opacity-60")}>
              <input defaultValue={s.title} onBlur={(e) => { const t = e.target.value.trim(); if (t && t !== s.title) void patchSection(s, { title: t }); }}
                aria-label={`Title for ${s.key}`} className="h-9 min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-2 text-sm font-semibold hover:border-line focus:border-ink focus:outline-none" />
              <span className="hidden text-xs text-muted sm:inline">{s.key.replace(/_/g, " ")}</span>
              <button onClick={() => moveSection(s, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-full hover:bg-ink-soft disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-4" /></button>
              <button onClick={() => moveSection(s, 1)} disabled={i === arr.length - 1} className="grid size-8 place-items-center rounded-full hover:bg-ink-soft disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-4" /></button>
              <button onClick={() => patchSection(s, { visible: !s.visible })} className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-2.5 text-xs font-semibold">
                {s.visible ? <><Eye className="size-3.5" /> Shown</> : <><EyeOff className="size-3.5" /> Hidden</>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Sheet open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Edit banner" : "New banner"} wide>
        {draft && (
          <div className="grid gap-3 text-sm">
            <label className="grid cursor-pointer place-items-center overflow-hidden rounded-[10px] border-[1.5px] border-dashed border-line bg-paper text-muted hover:border-ink" style={{ aspectRatio: draft.placement === "hero" ? "16/7" : "4/3" }}>
              {draft.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={draft.image_url} alt="Banner preview" className="size-full object-cover" />
                : <span className="grid justify-items-center gap-1 font-semibold"><ImagePlus className="size-6" />{busy ? "Uploading…" : "Choose picture"}</span>}
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {draft.image_url && <p className="text-xs text-muted">Tap the picture to change it.</p>}
            <label className="font-semibold">Title (optional)<input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={field} placeholder="Back to school" /></label>
            <label className="font-semibold">Subtitle (optional)<input value={draft.subtitle ?? ""} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} className={field} placeholder="Notebooks from ₹35" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold">Opens
                <select value={draft.link_type} onChange={(e) => setDraft({ ...draft, link_type: e.target.value as Draft["link_type"], link_value: "" })} className={field}>
                  <option value="category">A category</option><option value="product">A product</option><option value="search">Search results</option>
                  <option value="featured">Featured picks</option><option value="url">A shop page</option>
                </select>
              </label>
              {draft.link_type === "category" && <label className="font-semibold">Category<select value={draft.link_value ?? ""} onChange={(e) => setDraft({ ...draft, link_value: e.target.value })} className={field}><option value="">Choose…</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>}
              {draft.link_type === "product" && <label className="font-semibold">Product<select value={draft.link_value ?? ""} onChange={(e) => setDraft({ ...draft, link_value: e.target.value })} className={field}><option value="">Choose…</option>{products.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>}
              {draft.link_type === "search" && <label className="font-semibold">Search for<input value={draft.link_value ?? ""} onChange={(e) => setDraft({ ...draft, link_value: e.target.value })} className={field} placeholder="geometry box" /></label>}
              {draft.link_type === "url" && <label className="font-semibold">Page<input value={draft.link_value ?? ""} onChange={(e) => setDraft({ ...draft, link_value: e.target.value })} className={field} placeholder="/collections/deals" /></label>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold">Show from (optional)<input type="datetime-local" value={toLocal(draft.start_at)} onChange={(e) => setDraft({ ...draft, start_at: fromLocal(e.target.value) })} className={field} /></label>
              <label className="font-semibold">Until (optional)<input type="datetime-local" value={toLocal(draft.end_at)} onChange={(e) => setDraft({ ...draft, end_at: fromLocal(e.target.value) })} className={field} /></label>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="size-4 accent-[var(--ink)]" /> On</label>
            {err && <p className="font-semibold text-margin" role="alert">{err}</p>}
            <button onClick={saveDraft} disabled={busy} className="h-11 rounded-[10px] bg-ink font-semibold text-on-ink disabled:opacity-50">{busy ? "Saving…" : "Save banner"}</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
