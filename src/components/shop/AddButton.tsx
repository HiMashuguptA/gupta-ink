"use client";
import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { useCart, capFor } from "@/components/providers/CartProvider";
import { useFly } from "@/components/providers/FlyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import type { ProductCard } from "@/lib/types";

export function AddButton({ product, size = "sm", className }: { product: ProductCard; size?: "sm" | "lg"; className?: string }) {
  const { qtyOf, add, setQty } = useCart();
  const fly = useFly();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const qty = qtyOf(product.id);
  const out = capFor(product) <= 0;

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = add(product, 1);
    if (!ok) {
      toast({ kind: "error", title: `Only ${capFor(product)} per order`, body: "That's the most we can send in one order." });
      return;
    }
    const card = (e.currentTarget as HTMLElement).closest("[data-product-card]")?.querySelector("img");
    const rect = (card ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
    if (product.images[0]) fly(product.images[0], rect);
  };

  const big = size === "lg";
  if (out) {
    return (
      <span className={clsx("inline-flex items-center justify-center rounded-xl border border-line px-3 text-xs font-semibold text-muted", big ? "h-12 w-full text-sm" : "h-9", className)}>
        Out of stock
      </span>
    );
  }

  return (
    <div ref={ref} className={clsx(big ? "h-12 w-full" : "h-9 min-w-[76px]", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        {qty === 0 ? (
          <motion.button
            key="add"
            type="button"
            onClick={onAdd}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            whileTap={{ scale: 0.92 }}
            className={clsx(
              "flex size-full items-center justify-center rounded-xl border-[1.5px] border-ink bg-card font-bold text-ink transition-colors hover:bg-ink-soft",
              big ? "text-base" : "px-4 text-sm",
            )}
            aria-label={`Add ${product.name}${product.variant_label ? ", " + product.variant_label : ""} to cart`}
          >
            {big ? "Add to cart" : "Add"}
          </motion.button>
        ) : (
          <motion.div
            key="qty"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex size-full items-center justify-between rounded-xl bg-ink text-white"
          >
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty(product.id, qty - 1); }} className="grid h-full w-9 place-items-center" aria-label="Remove one">
              <Minus className="size-4" />
            </button>
            <motion.span key={qty} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="min-w-5 text-center text-sm font-bold tabular-nums" aria-live="polite">
              {qty}
            </motion.span>
            <button type="button" onClick={onAdd} className="grid h-full w-9 place-items-center" aria-label="Add one more">
              <Plus className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
