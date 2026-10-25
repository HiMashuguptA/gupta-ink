"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";

// Small shared cache so a page of tiles makes one wishlist query, not one per tile
let cache: { user: string; ids: Set<string>; promise?: Promise<Set<string>> } | null = null;
async function loadWishlist(userId: string) {
  if (cache?.user === userId) return cache.promise ?? cache.ids;
  const sb = supabaseBrowser();
  const promise = (async () => {
    const { data } = await sb.from("wishlist").select("product_id").eq("user_id", userId);
    const ids = new Set((data ?? []).map((d) => d.product_id as string));
    cache = { user: userId, ids };
    return ids;
  })();
  cache = { user: userId, ids: new Set(), promise };
  return promise;
}

export function WishlistHeart({ productId, className }: { productId: string; className?: string }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    void loadWishlist(user.id).then((ids) => live && setOn(ids.has(productId)));
    return () => { live = false; };
  }, [user, productId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ready) return;
    if (!user) return router.push("/login?next=" + encodeURIComponent(location.pathname));
    const sb = supabaseBrowser();
    const next = !on;
    setOn(next);
    if (next) cache?.ids.add(productId); else cache?.ids.delete(productId);
    const { error } = next
      ? await sb.from("wishlist").insert({ user_id: user.id, product_id: productId })
      : await sb.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
    if (error && error.code !== "23505") {
      setOn(!next);
      toast({ kind: "error", title: "Couldn't update your wishlist", body: "Check your connection and try again." });
    }
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.8 }}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Save to wishlist"}
      className={clsx("grid size-8 place-items-center rounded-full bg-card/85 backdrop-blur", className)}
    >
      <motion.span key={String(on)} initial={{ scale: on ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
        <Heart className={clsx("size-[18px]", on ? "fill-margin text-margin" : "text-muted")} />
      </motion.span>
    </motion.button>
  );
}
