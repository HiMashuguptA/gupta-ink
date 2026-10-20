"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/providers/ToastProvider";
import type { ProductCard } from "@/lib/types";

/** Puts the items of a past order back in the cart (what's still on sale and in stock). */
export function BuyAgain({ items, className }: { items: { product_id: string; qty: number }[]; className?: string }) {
  const { add } = useCart();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const { data } = await supabaseBrowser().from("product_cards").select("*").in("id", items.map((i) => i.product_id));
    const cards = (data ?? []) as ProductCard[];
    let added = 0;
    for (const it of items) {
      const p = cards.find((c) => c.id === it.product_id);
      if (p && p.stock > 0 && add(p, it.qty)) added++;
    }
    setBusy(false);
    const missing = items.length - added;
    if (!added) return toast({ kind: "error", title: "Nothing to add", body: "These items are out of stock or no longer sold." });
    toast({ kind: "ok", title: `${added} item${added === 1 ? "" : "s"} added to cart`, body: missing ? `${missing} couldn't be added (out of stock or already in your cart).` : undefined });
    router.push("/cart");
  };
  return (
    <button type="button" onClick={go} disabled={busy}
      className={className ?? "inline-flex h-11 items-center gap-2 rounded-xl border border-ink px-4 text-sm font-semibold text-ink disabled:opacity-50"}>
      <RotateCw className="size-4" /> {busy ? "Adding…" : "Buy again"}
    </button>
  );
}
