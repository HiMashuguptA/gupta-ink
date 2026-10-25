"use client";
import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { useCart, capFor } from "@/components/providers/CartProvider";
import { useFly } from "@/components/providers/FlyProvider";
import { useToast } from "@/components/providers/ToastProvider";
import type { ProductCard } from "@/lib/types";
import { Num } from "@/components/ui/Num";
import { petSay } from "@/lib/pet";

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
    petSay({ kind: "add", name: product.name });
  };

  const big = size === "lg";
  if (out) {
    return (
      <span className={clsx("inline-flex items-center justify-center rounded-[9px] bg-sunk px-3 text-xs font-semibold text-muted", big ? "h-12 w-full text-sm" : "h-9", className)}>
        Sold out
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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.1 } }}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className={clsx(
              "sign-type flex size-full items-center justify-center rounded-[9px] bg-nib text-on-nib transition-colors hover:bg-nib-deep",
              big ? "text-[19px]" : "px-4 text-[17px]",
            )}
            aria-label={`Add ${product.name}${product.variant_label ? ", " + product.variant_label : ""} to cart`}
          >
            {big ? "Add to cart" : "Add"}
          </motion.button>
        ) : (
          <motion.div
            key="qty"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="flex size-full items-center justify-between rounded-[9px] bg-nib text-on-nib"
          >
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty(product.id, qty - 1); if (qty - 1 <= 0) petSay({ kind: "remove", name: product.name }); }} className="press grid h-full w-9 place-items-center rounded-l-[9px] hover:bg-nib-deep" aria-label="Remove one">
              <Minus className="size-4" />
            </button>
            <span className="min-w-5 text-center text-[15px] font-bold" aria-live="polite"><Num value={qty} /></span>
            <button type="button" onClick={onAdd} className="press grid h-full w-9 place-items-center rounded-r-[9px] hover:bg-nib-deep" aria-label="Add one more">
              <Plus className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
