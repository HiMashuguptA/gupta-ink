"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
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
  clear: () => void;
  refreshPrices: () => Promise<void>;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "gi-cart-v1";

function readLocal(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function lineFrom(p: ProductCard, qty: number): CartLine {
  return {
    product_id: p.id, qty, name: p.name, slug: p.slug, variant_label: p.variant_label,
    image: p.images?.[0] ?? null, price_paise: p.price_paise, mrp_paise: p.mrp_paise,
    max_per_order: p.max_per_order, stock: p.stock,
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
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ }
  }, [lines]);

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
        const qty = Math.min(Math.max(s, l), p.max_per_order, p.stock);
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

  const add = useCallback(
    (p: ProductCard, qty = 1) => {
      const cap = Math.min(p.max_per_order, p.stock);
      let ok = true;
      setLines((all) => {
        const existing = all.find((l) => l.product_id === p.id);
        const next = Math.min((existing?.qty ?? 0) + qty, cap);
        if (next === (existing?.qty ?? 0)) { ok = false; return all; }
        pushServer(p.id, next);
        if (existing) return all.map((l) => (l.product_id === p.id ? { ...lineFrom(p, next) } : l));
        return [...all, lineFrom(p, next)];
      });
      return ok;
    },
    [pushServer],
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      setLines((all) => {
        const line = all.find((l) => l.product_id === id);
        if (!line) return all;
        const next = Math.max(0, Math.min(qty, line.max_per_order, line.stock));
        pushServer(id, next);
        return next === 0 ? all.filter((l) => l.product_id !== id) : all.map((l) => (l.product_id === id ? { ...l, qty: next } : l));
      });
    },
    [pushServer],
  );

  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);
  const clear = useCallback(() => {
    setLines([]);
    if (user) void sb.from("cart_items").delete().eq("user_id", user.id);
  }, [user, sb]);

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
        const qty = Math.min(l.qty, p.max_per_order, p.stock);
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
      qtyOf: (id) => lines.find((l) => l.product_id === id)?.qty ?? 0,
      add, setQty, remove, clear, refreshPrices,
    };
  }, [lines, add, setQty, remove, clear, refreshPrices]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}
