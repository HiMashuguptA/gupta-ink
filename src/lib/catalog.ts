import "server-only";
import { unstable_cache } from "next/cache";
import { supabasePublic } from "./supabase/public";
import { supabaseServer, getSessionProfile } from "./supabase/server";
import { groupCards, storageUrl } from "./format";
import type { Banner, Category, GroupCard, HomeSection, ProductCard, StoreSettings } from "./types";

/**
 * Catalogue data is public and the same for every shopper, so it is fetched once
 * and cached for 60 seconds (tag "catalog"). Admin edits call revalidateTag("catalog")
 * so changes appear immediately. This keeps page loads to a single cache read instead
 * of several round trips to the database.
 */
// Edits, orders and reviews refresh this cache on purpose (see app/actions/admin.ts); the timer is a backstop.
const CACHE = { revalidate: 300, tags: ["catalog"] };

const allCards = unstable_cache(
  async (): Promise<ProductCard[]> => {
    const sb = supabasePublic();
    const out: ProductCard[] = [];
    // Page through in 1000-row chunks (PostgREST's default cap)
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from("product_cards").select("*").order("sold_count", { ascending: false }).range(from, from + 999);
      if (error) throw error;
      out.push(...((data ?? []) as ProductCard[]));
      if (!data || data.length < 1000) break;
    }
    return out;
  },
  ["all-cards-v2"],
  CACHE,
);

const groupInfo = unstable_cache(
  async () => {
    const { data } = await supabasePublic().from("product_groups").select("id, description, returnable");
    return Object.fromEntries((data ?? []).map((g) => [g.id, g])) as Record<string, { id: string; description: string | null; returnable: boolean }>;
  },
  ["group-info-v1"],
  CACHE,
);

export const getSettings = unstable_cache(
  async (): Promise<StoreSettings | null> => {
    const { data } = await supabasePublic().from("settings").select("*").eq("id", 1).single();
    return data as StoreSettings | null;
  },
  ["settings-v1"],
  CACHE,
);

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const { data } = await supabasePublic().from("categories").select("id, name, slug, image_url, icon, sort").order("sort");
    return (data ?? []) as Category[];
  },
  ["categories-v1"],
  CACHE,
);

const homeContent = unstable_cache(
  async () => {
    const sb = supabasePublic();
    const [sections, banners] = await Promise.all([
      sb.from("home_sections").select("*").eq("visible", true).order("position"),
      sb.from("banners").select("*").order("position"),
    ]);
    return { sections: (sections.data ?? []) as HomeSection[], banners: (banners.data ?? []) as Banner[] };
  },
  ["home-content-v1"],
  CACHE,
);

type Collection = { title: string; pick: (c: ProductCard) => boolean; sort: (a: ProductCard, b: ProductCard) => number };
export const COLLECTIONS: Record<string, Collection> = {
  featured: { title: "Picked for you", pick: (c) => c.featured, sort: (a, b) => b.sold_count - a.sold_count },
  top_discounts: { title: "Biggest savings", pick: (c) => c.discount_pct > 0, sort: (a, b) => b.discount_pct - a.discount_pct },
  top_rated: { title: "Top rated", pick: () => true, sort: (a, b) => Number(b.rating_avg) - Number(a.rating_avg) || b.rating_count - a.rating_count },
  most_purchased: { title: "Most bought in Kohima", pick: () => true, sort: (a, b) => b.sold_count - a.sold_count },
  trending: { title: "Trending this week", pick: () => true, sort: (a, b) => b.view_count - a.view_count },
  monsoon: { title: "Monsoon ready", pick: (c) => c.seasonal_tag === "monsoon", sort: (a, b) => b.sold_count - a.sold_count },
};

function collectionFrom(cards: ProductCard[], key: string, limit: number): GroupCard[] {
  const c = COLLECTIONS[key];
  if (!c) return [];
  // Group first so every card shows its default variant, then rank groups
  const groups = groupCards(cards).filter((g) => g.variants.some(c.pick));
  return groups.sort(c.sort).slice(0, limit);
}

export async function getCollection(key: string, limit = 12) {
  return collectionFrom(await allCards(), key, limit);
}

/** Stable per-day shuffle (India time), so the shop looks different each day but not on every refresh. */
function dailyShuffle<T extends { group_id: string }>(list: T[]): T[] {
  const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const h = (s: string) => { let x = 2166136261; for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return x >>> 0; };
  return [...list].sort((a, b) => h(day + a.group_id) - h(day + b.group_id));
}

export async function getHome() {
  const [cards, content, categories] = await Promise.all([allCards(), homeContent(), getCategories()]);
  const rails: Record<string, GroupCard[]> = {};
  for (const key of ["top_discounts", "top_rated", "most_purchased", "trending"]) rails[key] = collectionFrom(cards, key, 12);
  // Featured pool: shuffled daily; signed-in shoppers then get their own picks in the browser
  rails.featured = dailyShuffle(collectionFrom(cards, "featured", 40)).slice(0, 12);
  rails.seasonal = collectionFrom(cards, "monsoon", 12);
  return {
    sections: content.sections,
    hero: content.banners.filter((b) => b.placement === "hero"),
    promos: content.banners.filter((b) => b.placement === "promo"),
    categories,
    rails,
  };
}

export async function getRecentlyViewed(userId: string): Promise<GroupCard[]> {
  const sb = await supabaseServer();
  const [{ data: recent }, cards] = await Promise.all([
    sb.from("recently_viewed").select("group_id, viewed_at").eq("user_id", userId).order("viewed_at", { ascending: false }).limit(12),
    allCards(),
  ]);
  const groups = groupCards(cards);
  return (recent ?? []).map((r) => groups.find((g) => g.group_id === r.group_id)).filter(Boolean) as GroupCard[];
}

export async function getCategoryProducts(slug: string) {
  const [categories, cards] = await Promise.all([getCategories(), allCards()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  return { category, products: groupCards(cards.filter((c) => c.category_id === category.id)) };
}

const reviewsFor = unstable_cache(
  async (groupId: string) => {
    const { data } = await supabasePublic().from("reviews").select("id, stars, comment, photos, reviewer_name, created_at")
      .eq("group_id", groupId).order("created_at", { ascending: false }).limit(10);
    return ((data ?? []) as { id: string; stars: number; comment: string | null; photos: string[]; reviewer_name: string | null; created_at: string }[])
      .map((r) => ({ ...r, photos: r.photos.map((ph) => storageUrl("reviews", ph)) }));
  },
  ["reviews-v2"],
  { revalidate: 300, tags: ["catalog", "reviews"] },
);

export async function getProduct(slug: string) {
  const [cards, info] = await Promise.all([allCards(), groupInfo()]);
  const rows = cards.filter((c) => c.slug === slug);
  if (!rows.length) return null;
  const card = groupCards(rows)[0];
  const reviews = await reviewsFor(card.group_id);
  return {
    card,
    description: info[card.group_id]?.description ?? null,
    similar: groupCards(cards.filter((c) => c.category_id === card.category_id && c.group_id !== card.group_id)).slice(0, 10),
    reviews,
  };
}

const searchIds = unstable_cache(
  async (q: string) => {
    const { data, error } = await supabasePublic().rpc("search_products", { p_q: q, p_limit: 60 });
    if (error) throw error;
    return (data ?? []).map((r) => r.id);
  },
  ["search-v1"],
  CACHE,
);

/** Search with exact/fuzzy matches first, then same-category suggestions. */
export async function searchCatalog(q: string) {
  const term = q.trim().toLowerCase().slice(0, 80);
  const [ids, cards, session] = await Promise.all([searchIds(term).catch(() => [] as string[]), allCards(), getSessionProfile()]);
  // Hydrate full product rows (stock limits, units, etc.) in the ranked order
  const byId = new Map(cards.map((c) => [c.id, c]));
  const rows = ids.map((id) => byId.get(id)).filter(Boolean) as ProductCard[];
  const matches = groupCards(rows, "first");
  let related: GroupCard[] = [];
  if (matches.length) {
    const catIds = new Set(matches.slice(0, 3).map((m) => m.category_id));
    const seen = new Set(matches.map((m) => m.group_id));
    related = groupCards(cards.filter((c) => catIds.has(c.category_id) && !seen.has(c.group_id))).slice(0, 12);
  }
  // Search terms are logged for signed-in shoppers only (rate limited on the server)
  if (session.user) await session.supabase.rpc("log_search", { p_term: term, p_results: matches.length });
  return { matches, related };
}

/** Shop links for ordered items (from the cached catalogue; items no longer on sale get none). */
export async function productLinks(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const want = new Set(ids);
  const links: Record<string, string> = {};
  for (const c of await allCards()) if (want.has(c.id)) links[c.id] = `/p/${c.slug}?v=${c.id}`;
  return links;
}
