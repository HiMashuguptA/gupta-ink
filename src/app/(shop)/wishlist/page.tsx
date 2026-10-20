import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { groupCards } from "@/lib/format";
import { Grid } from "@/components/shop/Rail";
import type { ProductCard } from "@/lib/types";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const { supabase, user } = await getSessionProfile();
  if (!user) redirect("/login?next=/wishlist");
  const { data: saved } = await supabase.from("wishlist").select("product_id").eq("user_id", user.id).order("created_at", { ascending: false });
  const ids = (saved ?? []).map((s) => s.product_id);
  const { data } = ids.length ? await supabase.from("product_cards").select("*").in("id", ids) : { data: [] };
  // One tile per saved variant, so the saved colour is what shows
  const cards = groupCards(((data ?? []) as ProductCard[]).map((p) => ({ ...p, group_id: p.id })));

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-extrabold">Wishlist</h1>
      {cards.length ? (
        <Grid cards={cards} />
      ) : (
        <div className="ruled rounded-3xl p-8 pl-14">
          <h2 className="text-lg font-bold">Nothing saved yet</h2>
          <p className="mt-1 text-muted">Tap the heart on any product to keep it here for later.</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Browse products</Link>
        </div>
      )}
    </div>
  );
}
