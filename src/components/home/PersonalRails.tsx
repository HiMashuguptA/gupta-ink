"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { groupCards } from "@/lib/format";
import { Rail } from "@/components/shop/Rail";
import type { GroupCard, ProductCard } from "@/lib/types";

async function cardsFor(ids: string[]): Promise<GroupCard[]> {
  if (!ids.length) return [];
  const { data } = await supabaseBrowser().from("product_cards").select("*").in("group_id", ids);
  const groups = groupCards((data ?? []) as ProductCard[]);
  const byId = new Map(groups.map((g) => [g.group_id, g]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as GroupCard[];
}

/**
 * "Picked for you": the page arrives with a shared list (shuffled daily) so it shows
 * instantly, then swaps in this shopper's own picks from their searches, orders,
 * wishlist and views. The order changes every day.
 */
export function PickedForYou({ title, href, initial }: { title: string; href?: string; initial: GroupCard[] }) {
  const { user, ready } = useSession();
  const [cards, setCards] = useState(initial);
  useEffect(() => {
    if (!ready) return;
    let live = true;
    (async () => {
      const { data, error } = await supabaseBrowser().rpc("picked_for_you", { p_limit: 12 });
      if (error || !data?.length) return;
      const picks = await cardsFor((data as unknown as (string | { picked_for_you: string })[]).map((r) => (typeof r === "string" ? r : r.picked_for_you)));
      if (live && picks.length >= 4) setCards(picks);
    })();
    return () => { live = false; };
  }, [ready, user?.id]);
  return <Rail title={title} href={href} cards={cards} />;
}

/** Recently viewed: personal, so it loads in the browser after the page is up. */
export function RecentlyViewed({ title }: { title: string }) {
  const { user } = useSession();
  const [cards, setCards] = useState<GroupCard[]>([]);
  useEffect(() => {
    if (!user) return setCards([]);
    let live = true;
    (async () => {
      const { data } = await supabaseBrowser().from("recently_viewed").select("group_id").eq("user_id", user.id)
        .order("viewed_at", { ascending: false }).limit(12);
      const list = await cardsFor((data ?? []).map((r) => r.group_id as string));
      if (live) setCards(list);
    })();
    return () => { live = false; };
  }, [user]);
  return <Rail title={title} cards={cards} />;
}
