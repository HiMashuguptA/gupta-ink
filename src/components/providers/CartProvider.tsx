"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLive } from "@/lib/live";
import { useSession } from "./SessionProvider";
import type { ProductCard } from "@/lib/types";

export type CartLine = {
  product_id: string;
  qty: number;
  name: string;
  slug: string;
  variant_label: string | null;
  image: string | null;
  price_paise: number;
  mrp_paise: number;
  max_per_order: number;
  stock: number;
};

type Ctx = {
  lines: CartLine[];
  count: number;
  itemsTotal: number;
  mrpTotal: number;
  qtyOf: (id: string) => number;
  add: (p: ProductCard, qty?: number) => boolean;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  clear: () => void;
  refreshPrices: () => Promise<void>;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "gi-cart-v1";

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Most units one order may hold for a product (per-order limit and stock, with safe defaults). */
export function capFor(p: { max_per_order?: number | null; stock?: number | null }) {
  return Math.max(0, Math.min(num(p.max_per_order, 20), num(p.stock, 0)));
}

function readLocal(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    // Drop anything malformed (for example a NaN quantity saved by an older version)
    return parsed.filter((l) => l && typeof l.product_id === "string" && Number.isInteger(l.qty) && l.qty > 0 && Number.isFinite(l.price_paise));
  } catch {
    return [];
  }
}

function writeLocal(lines: CartLine[]) {
  try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ }
}

export function lineFrom(p: ProductCard, qty: number): CartLine {
  return {
    product_id: p.id, qty, name: p.name, slug: p.slug, variant_label: p.variant_label,
    image: p.images?.[0] ?? null, price_paise: p.price_paise, mrp_paise: p.mrp_paise,
    max_per_order: num(p.max_per_order, 20), stock: num(p.stock, 0),
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const sb = supabaseBrowser();
  const [lines, setLines] = useState<CartLine[]>([]);
  const loaded = useRef(false);
  const syncedUser = useRef<string | null>(null);

  // Load from this device
  useEffect(() => {
    setLines(readLocal());
    loaded.current = true;
  }, []);

  // Persist on this device
  useEffect(() => {
    if (!loaded.current) return;
    writeLocal(lines);
  }, [lines]);

  // Another tab on this device changed the cart
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setLines(readLocal()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // On sign-in: merge the server cart with this device's cart
  useEffect(() => {
    if (!user || syncedUser.current === user.id) return;
    syncedUser.current = user.id;
    (async () => {
      const { data: server } = await sb.from("cart_items").select("product_id, qty").eq("user_id", user.id);
      const local = readLocal();
      const ids = [...new Set([...(server ?? []).map((s) => s.product_id), ...local.map((l) => l.product_id)])];
      if (!ids.length) return;
      const { data: products } = await sb.from("product_cards").select("*").in("id", ids);
      const merged: CartLine[] = [];
      for (const p of (products ?? []) as ProductCard[]) {
        const s = server?.find((x) => x.product_id === p.id)?.qty ?? 0;
        const l = local.find((x) => x.product_id === p.id)?.qty ?? 0;
        const qty = Math.min(Math.max(s, l), capFor(p));
        if (qty > 0) merged.push(lineFrom(p, qty));
      }
      setLines(merged);
      if (merged.length) {
        await sb.from("cart_items").upsert(merged.map((m) => ({ user_id: user.id, product_id: m.product_id, qty: m.qty })));
      }
    })();
  }, [user, sb]);

  const pushServer = useCallback(
    (id: string, qty: number) => {
      if (!user) return;
      if (qty <= 0) void sb.from("cart_items").delete().eq("user_id", user.id).eq("product_id", id);
      else void sb.from("cart_items").upsert({ user_id: user.id, product_id: id, qty });
    },
    [user, sb],
  );

  // Keep a live copy of the cart so add/setQty can decide synchronously
  // (React runs state-updater functions later, so they can't return a result).
  const linesRef = useRef<CartLine[]>([]);
  linesRef.current = lines;
  const lastLocal = useRef(0);
  const commit = useCallback((next: CartLine[]) => {
    linesRef.current = next;
    lastLocal.current = Date.now();
    setLines(next);
  }, []);

  // Signed in: the saved cart is the source of truth across devices. When it changes
  // elsewhere (another phone, or an order emptying it), take the server's version,
  // unless this screen changed the cart a moment ago and its own save is still landing.
  const pullServer = useCallback(async () => {
    if (!user) return;
    if (Date.now() - lastLocal.current < 2500) return;
    const { data: server } = await sb.from("cart_items").select("product_id, qty").eq("user_id", user.id);
    const rows = server ?? [];
    if (Date.now() - lastLocal.current < 2500) return;
    const ids = rows.map((r) => r.product_id);
    const { data: products } = ids.length ? await sb.from("product_cards").select("*").in("id", ids) : { data: [] };
    const next: CartLine[] = [];
    for (const r of rows) {
      const p = (products ?? [] as ProductCard[]).find((x) => (x as ProductCard).id === r.product_id) as ProductCard | undefined;
      if (p) next.push(lineFrom(p, Math.min(r.qty, Math.max(1, capFor(p)))));
    }
    const same = next.length === linesRef.current.length && next.every((n) => linesRef.current.some((l) => l.product_id === n.product_id && l.qty === n.qty));
    if (!same) { linesRef.current = next; setLines(next); }
  }, [user, sb]);
  useLive(`cart-${user?.id ?? "guest"}`, user ? [{ table: "cart_items", filter: `user_id=eq.${user.id}` }] : [], () => void pullServer(),
    { enabled: !!user, waitMs: 800 });

  const add = useCallback(
    (p: ProductCard, qty = 1) => {
      const all = linesRef.current;
      const existing = all.find((l) => l.product_id === p.id);
      const have = existing?.qty ?? 0;
      const next = Math.min(have + qty, capFor(p));
      if (!Number.isFinite(next) || next <= have) return false;
      commit(existing ? all.map((l) => (l.product_id === p.id ? lineFrom(p, next) : l)) : [...all, lineFrom(p, next)]);
      pushServer(p.id, next);
      return true;
    },
    [pushServer, commit],
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      const all = linesRef.current;
      const line = all.find((l) => l.product_id === id);
      if (!line) return;
      const next = Math.max(0, Math.min(Math.floor(num(qty, 0)), capFor(line)));
      if (next === line.qty) return;
      commit(next === 0 ? all.filter((l) => l.product_id !== id) : all.map((l) => (l.product_id === id ? { ...l, qty: next } : l)));
      pushServer(id, next);
    },
    [pushServer, commit],
  );

  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);
  // After an order: drop just the items that were ordered (Buy now leaves the rest of the cart alone)
  const removeMany = useCallback((ids: string[]) => {
    const gone = new Set(ids);
    const next = linesRef.current.filter((l) => !gone.has(l.product_id));
    commit(next);
    writeLocal(next);
    if (user && ids.length) void sb.from("cart_items").delete().eq("user_id", user.id).in("product_id", ids);
  }, [commit, user, sb]);
  const clear = useCallback(() => {
    commit([]);
    writeLocal([]); // before any navigation, so a reload can't bring it back
    if (user) void sb.from("cart_items").delete().eq("user_id", user.id);
  }, [user, sb, commit]);

  // Refresh prices and stock from the server (prices shown in cart are always current)
  const refreshPrices = useCallback(async () => {
    const ids = lines.map((l) => l.product_id);
    if (!ids.length) return;
    const { data } = await sb.from("product_cards").select("*").in("id", ids);
    const fresh = (data ?? []) as ProductCard[];
    setLines((all) =>
      all.flatMap((l) => {
        const p = fresh.find((f) => f.id === l.product_id);
        if (!p) return [];
        const qty = Math.min(l.qty, capFor(p));
        return qty > 0 ? [lineFrom(p, qty)] : [{ ...lineFrom(p, l.qty), stock: 0 }];
      }),
    );
  }, [lines, sb]);

  const value = useMemo<Ctx>(() => {
    const count = lines.reduce((a, l) => a + l.qty, 0);
    const itemsTotal = lines.reduce((a, l) => a + l.qty * l.price_paise, 0);
    const mrpTotal = lines.reduce((a, l) => a + l.qty * l.mrp_paise, 0);
    return {
      lines, count, itemsTotal, mrpTotal,
      qtyOf: (id) => num(lines.find((l) => l.product_id === id)?.qty, 0),
      add, setQty, remove, removeMany, clear, refreshPrices,
    };
  }, [lines, add, setQty, remove, removeMany, clear, refreshPrices]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}
