import { getHome, getRecentlyViewed, getSettings } from "@/lib/catalog";
import { getSessionProfile } from "@/lib/supabase/server";
import { storeStatus } from "@/lib/hours";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { PromoTiles } from "@/components/home/PromoTiles";
import { StoreNotice } from "@/components/home/StoreNotice";
import { Rail } from "@/components/shop/Rail";
import type { GroupCard } from "@/lib/types";

export const revalidate = 0;

const RAIL_LINKS: Record<string, string> = {
  featured: "/collections/featured",
  top_discounts: "/collections/top_discounts",
  top_rated: "/collections/top_rated",
  most_purchased: "/collections/most_purchased",
  trending: "/collections/trending",
  seasonal: "/collections/monsoon",
};

export default async function Home() {
  const [{ user }, home, settings] = await Promise.all([getSessionProfile(), getHome(), getSettings()]);
  const recent: GroupCard[] = user ? await getRecentlyViewed(user.id) : [];
  const status = storeStatus(settings);

  // Admin controls which sections show and in what order (home_sections table)
  const sections = home.sections.length
    ? home.sections
    : ["featured", "top_discounts", "promos", "categories", "recent", "top_rated", "most_purchased", "trending", "seasonal"].map((key, i) => ({ key, title: "", position: i, visible: true, config: {} }));

  return (
    <>
      <StoreNotice quickOpen={status.quickOpen} storeOpen={status.storeOpen} paused={!!settings?.orders_paused} />
      <HeroCarousel banners={home.hero} />
      {sections.map((s) => {
        switch (s.key) {
          case "promos":
            return <PromoTiles key={s.key} promos={home.promos} />;
          case "categories":
            return <CategoryGrid key={s.key} categories={home.categories} title={s.title || undefined} />;
          case "recent":
            return <Rail key={s.key} title={s.title || "Recently viewed"} cards={recent} />;
          default: {
            const cards = home.rails[s.key] ?? [];
            return <Rail key={s.key} title={s.title} href={RAIL_LINKS[s.key]} cards={cards} />;
          }
        }
      })}
      {!home.categories.length && (
        <div className="ruled mx-4 mt-8 rounded-3xl p-8 pl-14">
          <h2 className="text-xl font-bold">The shelves are empty</h2>
          <p className="mt-1 text-muted">Load the test catalogue (supabase/seed.sql) or add products from the admin panel.</p>
        </div>
      )}
    </>
  );
}
