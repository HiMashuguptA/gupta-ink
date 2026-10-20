import "server-only";
import { supabaseServer } from "./supabase/server";
import { groupCards } from "./format";
import type { Banner, Category, GroupCard, HomeSection, ProductCard, StoreSettings } from "./types";

const CARD = "*";

export async function getSettings(): Promise<StoreSettings | null> {
  const sb = await supabaseServer();
  const { data } = await sb.from("settings").select("*").eq("id", 1).single();
  return data as StoreSettings | null;
}

export async function getCategories(): Promise<Category[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("categories").select("id, name, slug, image_url, icon, sort").order("sort");
  return (data ?? []) as Category[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST builder generics are too deep to name here
type Q = any;
export const COLLECTIONS: Record<string, { title: string; order: keyof ProductCard; filter?: (q: Q) => Q }> = {
  featured: { title: "Picked for you", order: "sold_count", filter: (q) => q.eq("featured", true) },
  top_discounts: { title: "Biggest savings", order: "discount_pct", filter: (q) => q.gt("discount_pct", 0) },
  top_rated: { title: "Top rated", order: "rating_avg" },
  most_purchased: { title: "Most bought in Kohima", order: "sold_count" },
  trending: { title: "Trending this week", order: "view_count" },
  monsoon: { title: "Monsoon ready", order: "sold_count", filter: (q) => q.eq("seasonal_tag", "monsoon") },
};

export async function getCollection(key: string, limit = 12): Promise<GroupCard[]> {
  const c = COLLECTIONS[key];
  if (!c) return [];
  const sb = await supabaseServer();
  let q = sb.from("product_cards").select(CARD);
  if (c.filter) q = c.filter(q);
  const { data } = await q.order(c.order as string, { ascending: false }).limit(limit * 3);
  return groupCards((data ?? []) as ProductCard[]).slice(0, limit);
}

export async function getHome() {
  const sb = await supabaseServer();
  const [sections, banners, categories, featured, discounts, rated, bought, trending, seasonal] = await Promise.all([
    sb.from("home_sections").select("*").eq("visible", true).order("position"),
    sb.from("banners").select("*").order("position"),
    getCategories(),
    getCollection("featured"),
    getCollection("top_discounts"),
    getCollection("top_rated"),
    getCollection("most_purchased"),
    getCollection("trending"),
    getCollection("monsoon"),
  ]);
  const all = (banners.data ?? []) as Banner[];
  return {
    sections: (sections.data ?? []) as HomeSection[],
    hero: all.filter((b) => b.placement === "hero"),
    promos: all.filter((b) => b.placement === "promo"),
    categories,
    rails: { featured, top_discounts: discounts, top_rated: rated, most_purchased: bought, trending, seasonal } as Record<string, GroupCard[]>,
  };
}

export async function getRecentlyViewed(userId: string): Promise<GroupCard[]> {
  const sb = await supabaseServer();
  const { data: recent } = await sb
    .from("recently_viewed").select("group_id, viewed_at").eq("user_id", userId)
    .order("viewed_at", { ascending: false }).limit(12);
  const ids = (recent ?? []).map((r) => r.group_id);
  if (!ids.length) return [];
  const { data } = await sb.from("product_cards").select(CARD).in("group_id", ids);
  const cards = groupCards((data ?? []) as ProductCard[]);
  return ids.map((id) => cards.find((c) => c.group_id === id)).filter(Boolean) as GroupCard[];
}

export async function getCategoryProducts(slug: string) {
  const sb = await supabaseServer();
  const { data: category } = await sb.from("categories").select("id, name, slug, image_url, icon, sort").eq("slug", slug).single();
  if (!category) return null;
  const { data } = await sb.from("product_cards").select(CARD).eq("category_id", category.id).order("sold_count", { ascending: false });
  return { category: category as Category, products: groupCards((data ?? []) as ProductCard[]) };
}

export async function getProduct(slug: string) {
  const sb = await supabaseServer();
  const { data: rows } = await sb.from("product_cards").select(CARD).eq("slug", slug);
  if (!rows?.length) return null;
  const card = groupCards(rows as ProductCard[])[0];
  const [{ data: group }, { data: similarRows }, { data: reviews }] = await Promise.all([
    sb.from("product_groups").select("id, description, returnable").eq("id", card.group_id).single(),
    sb.from("product_cards").select(CARD).eq("category_id", card.category_id).neq("group_id", card.group_id).order("sold_count", { ascending: false }).limit(24),
    sb.from("reviews").select("id, stars, comment, photos, created_at").eq("group_id", card.group_id).order("created_at", { ascending: false }).limit(10),
  ]);
  return {
    card,
    description: (group?.description as string | null) ?? null,
    similar: groupCards((similarRows ?? []) as ProductCard[]).slice(0, 10),
    reviews: (reviews ?? []) as { id: string; stars: number; comment: string | null; photos: string[]; created_at: string }[],
  };
}

/** Search with exact/fuzzy matches first, then same-category suggestions. */
export async function searchCatalog(q: string) {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("search_products", { p_q: q, p_limit: 60 });
  let rows = (data ?? []) as (ProductCard & { score: number })[];
  if (error) {
    // Fallback while the search function is not installed: simple name/tag match.
    // Only letters, digits, spaces and hyphens reach the filter (prevents filter injection)
    const safe = q.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 60);
    const like = `%${safe}%`;
    const { data: fb } = await sb.from("product_cards").select(CARD).or(`name.ilike.${like},brand.ilike.${like},category_name.ilike.${like}`).limit(60);
    rows = (fb ?? []) as (ProductCard & { score: number })[];
  }
  const matches = groupCards(rows as ProductCard[], "first");
  let related: GroupCard[] = [];
  if (matches.length) {
    const catIds = [...new Set(matches.slice(0, 3).map((m) => m.category_id))];
    const { data: rel } = await sb.from("product_cards").select(CARD).in("category_id", catIds).order("sold_count", { ascending: false }).limit(40);
    const seen = new Set(matches.map((m) => m.group_id));
    related = groupCards((rel ?? []) as ProductCard[]).filter((g) => !seen.has(g.group_id)).slice(0, 12);
  }
  // Search terms are logged for signed-in shoppers only (rate limited on the server)
  const { data: { user } } = await sb.auth.getUser();
  if (user) await sb.rpc("log_search", { p_term: q, p_results: matches.length });
  return { matches, related };
}
