"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { slugify } from "@/lib/format";
import { useSynced } from "@/lib/live";
import { refreshCatalog } from "@/app/actions/admin";

export type Cat = { id: string; name: string; slug: string; sort: number; active: boolean; products: number };

export function CategoryManager({ initial }: { initial: Cat[] }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [cats, setCats] = useSynced(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = async () => { await refreshCatalog(); router.refresh(); };
  const fail = (m: string) => setMsg({ ok: false, text: m });

  const add = async () => {
    const nm = name.trim();
    if (!nm) return;
    if (cats.some((c) => c.name.toLowerCase() === nm.toLowerCase())) return fail("That category already exists");
    setBusy(true); setMsg(null);
    const { data, error } = await sb.from("categories").insert({ name: nm, slug: slugify(nm), sort: cats.length + 1, active: true }).select("id, name, slug, sort, active").single();
    setBusy(false);
    if (error) return fail(error.code === "23505" ? "A category with a similar web address exists" : error.message);
    setCats((c) => [...c, { ...data, products: 0 }]);
    setName("");
    setMsg({ ok: true, text: `"${data.name}" added.` });
    void done();
  };
  const rename = async (c: Cat, nm: string) => {
    nm = nm.trim();
    if (!nm || nm === c.name) return;
    const { error } = await sb.from("categories").update({ name: nm }).eq("id", c.id);
    if (error) return fail(error.message);
    setCats((all) => all.map((x) => (x.id === c.id ? { ...x, name: nm } : x)));
    void done();
  };
  const toggle = async (c: Cat) => {
    const { error } = await sb.from("categories").update({ active: !c.active }).eq("id", c.id);
    if (error) return fail(error.message);
    setCats((all) => all.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)));
    void done();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const list = [...cats]; const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const next = list.map((c, k) => ({ ...c, sort: k + 1 }));
    setCats(next);
    await Promise.all(next.map((c) => sb.from("categories").update({ sort: c.sort }).eq("id", c.id)));
    void done();
  };
  const remove = async (c: Cat) => {
    if (c.products) return fail(`Move or delete the ${c.products} product${c.products === 1 ? "" : "s"} in "${c.name}" first, or hide it instead.`);
    if (!window.confirm(`Delete the category "${c.name}"?`)) return;
    const { error } = await sb.from("categories").delete().eq("id", c.id);
    if (error) return fail(error.message);
    setCats((all) => all.filter((x) => x.id !== c.id));
    void done();
  };

  return (
    <div className="mt-5 space-y-4 text-sm">
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
          placeholder="New category name, e.g. Craft Paper" aria-label="New category name"
          className="h-10 min-w-0 flex-1 rounded-[10px] border border-line bg-card px-3 outline-none focus:border-ink" />
        <button onClick={add} disabled={busy || !name.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-ink px-4 font-semibold text-on-ink disabled:opacity-50"><Plus className="size-4" /> Add</button>
      </div>
      {msg && <p className={clsx("font-semibold", msg.ok ? "text-ok" : "text-margin")} role="status">{msg.text}</p>}
      <ul className="divide-y divide-line rounded-[12px] bg-card">
        {cats.map((c, i) => (
          <li key={c.id} className={clsx("flex items-center gap-2 p-3", !c.active && "opacity-60")}>
            <input defaultValue={c.name} onBlur={(e) => void rename(c, e.target.value)} aria-label={`Name of ${c.name}`}
              className="h-9 min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-2 font-semibold hover:border-line focus:border-ink focus:outline-none" />
            <Link href={`/c/${c.slug}`} target="_blank" className="hidden text-xs text-muted hover:underline sm:inline">{c.products} product{c.products === 1 ? "" : "s"}</Link>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-full hover:bg-ink-soft disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-4" /></button>
            <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} className="grid size-8 place-items-center rounded-full hover:bg-ink-soft disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-4" /></button>
            <button onClick={() => toggle(c)} className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-2.5 text-xs font-semibold">
              {c.active ? <><Eye className="size-3.5" /> Shown</> : <><EyeOff className="size-3.5" /> Hidden</>}
            </button>
            <button onClick={() => remove(c)} className="grid size-8 place-items-center rounded-full text-margin hover:bg-margin/10" aria-label={`Delete ${c.name}`}><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
