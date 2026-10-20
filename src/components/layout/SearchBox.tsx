"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, LayoutGrid, CornerDownLeft } from "lucide-react";
import clsx from "clsx";
import { supabaseBrowser } from "@/lib/supabase/client";
import { startNav } from "./NavProgress";

type Suggestion = { kind: "product" | "category"; label: string; slug: string; group_id: string | null; category_slug: string; image: string | null };

const HINTS = ["gel pen", "geometry box", "A4 paper", "notebook", "highlighter", "waterproof folder", "cash book"];

export function SearchBox({ autoFocus = false, id = "search" }: { autoFocus?: boolean; id?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [hint, setHint] = useState(0);
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2600);
    return () => clearInterval(t);
  }, []);

  // Suggestions update on every word typed (debounced so we don't flood the server)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setItems([]); return; }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const sb = supabaseBrowser();
      const { data, error } = await sb.rpc("search_suggestions", { p_q: term });
      let rows = (data ?? []) as unknown as Suggestion[];
      if (error) {
        const safe = term.replace(/[^\p{L}\p{N}\s-]/gu, "").slice(0, 60);
        const { data: fb } = await sb.from("product_cards").select("group_id, name, slug, category_slug, images").ilike("name", `%${safe}%`).limit(12);
        const seen = new Set<string>();
        rows = (fb ?? []).filter((r) => r.group_id && (seen.has(r.group_id) ? false : (seen.add(r.group_id), true))).slice(0, 6)
          .map((r) => ({ kind: "product" as const, label: r.name ?? "", slug: r.slug ?? "", group_id: r.group_id, category_slug: r.category_slug ?? "", image: r.images?.[0] ?? null }));
      }
      if (mine === seq.current) { setItems(rows); setActive(-1); }
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  const go = (s?: Suggestion) => {
    setOpen(false);
    inputRef.current?.blur();
    if (!s) {
      const term = q.trim();
      if (term.length >= 2) { startNav(); router.push(`/search?q=${encodeURIComponent(term)}`); }
      return;
    }
    // Picking a suggested product opens its category with that product highlighted first
    startNav();
    if (s.kind === "product") router.push(`/c/${s.category_slug}?highlight=${s.group_id}&from=${encodeURIComponent(q.trim())}`);
    else router.push(`/c/${s.slug}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === "Enter") { e.preventDefault(); go(active >= 0 ? items[active] : undefined); }
    else if (e.key === "Escape") setOpen(false);
  };

  const highlight = (label: string) => {
    const term = q.trim().toLowerCase();
    const i = label.toLowerCase().indexOf(term);
    if (!term || i < 0) return label;
    return (<>{label.slice(0, i)}<mark className="bg-transparent font-bold text-ink">{label.slice(i, i + term.length)}</mark>{label.slice(i + term.length)}</>);
  };

  return (
    <div className="relative w-full">
      <form role="search" onSubmit={(e) => { e.preventDefault(); go(); }} className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search stationery"
          enterKeyHint="search"
          className="h-11 w-full rounded-xl border border-line bg-card pl-10 pr-10 text-[15px] outline-none transition placeholder:text-transparent focus:border-ink focus:ring-2 focus:ring-ink/15"
          placeholder="Search"
        />
        {!q && (
          <span className="pointer-events-none absolute left-10 top-1/2 flex -translate-y-1/2 items-center gap-1 overflow-hidden text-[15px] text-muted">
            Search for
            <AnimatePresence mode="wait">
              <motion.span key={hint} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.25 }}>
                &ldquo;{HINTS[hint]}&rdquo;
              </motion.span>
            </AnimatePresence>
          </span>
        )}
        {q && (
          <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-paper" aria-label="Clear search">
            <X className="size-4" />
          </button>
        )}
      </form>

      <AnimatePresence>
        {open && items.length > 0 && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-line bg-card py-1.5 shadow-xl shadow-ink/10"
          >
            {items.map((s, i) => (
              <li
                key={`${s.kind}-${s.slug}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); go(s); }}
                onMouseEnter={() => setActive(i)}
                className={clsx("flex cursor-pointer items-center gap-3 px-3 py-2", i === active && "bg-ink-soft")}
              >
                {s.kind === "product" && s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image} alt="" className="size-9 shrink-0 rounded-lg" />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper"><LayoutGrid className="size-4 text-ink" /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{highlight(s.label)}</span>
                  <span className="block text-xs text-muted">{s.kind === "category" ? "Category" : `in ${s.category_slug.replace(/-/g, " ")}`}</span>
                </span>
              </li>
            ))}
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); go(); }}
              className="flex cursor-pointer items-center gap-2 border-t border-line px-3 pb-1 pt-2.5 text-sm font-semibold text-ink"
            >
              <CornerDownLeft className="size-4" /> See all results for &ldquo;{q.trim()}&rdquo;
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
