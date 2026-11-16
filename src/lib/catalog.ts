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

type Q = ReturnType<ReturnType<typeof supabasePublic>["from"]>;
type Sel = ReturnType<Q["select"]>;

/**
 * While the site is being built, every public page is rendered once and shipped with the deploy.
 * That copy is what visitors and search engines get whenever nothing fresher is cached, so a query
 * that fails during the build must not bake an empty shelf or a "not found" product into it:
 * the build retries, then stops (the previous deploy stays live). On the live site a failed query
 * throws straight away, so one slow moment is never cached as empty.
 */
export const BUILDING = process.env.NEXT_PHASE === "phase-production-build";
async function settled<T>(run: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    const { data, error } = await run();
    if (!error) return data;
    if (!BUILDING || attempt >= 3) throw error;
    await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
  }
}

/**
 * Product rows straight from the database, filtered and limited there. Pages never load the
 * whole catalogue: a Cloudflare Worker gets very little CPU time per request, and parsing all
 * products on every page was what pushed requests over the limit (Error 1102).
 */
async function cardRows(build: (q: Sel) => Sel): Promise<ProductCard[]> {
  return ((await settled(() => build(supabasePublic().from("product_cards").select("*")))) ?? []) as ProductCard[];
}

/** Every product page address, for the build (each is rendered once and shipped with the deploy) and the sitemap. */
export async function allProductSlugs(): Promise<{ slug: string; created_at: string; category_slug: string; image: string | null }[]> {
  type Row = { slug: string; created_at: string; category_slug: string; images: string[] | null };
  const seen = new Map<string, { slug: string; created_at: string; category_slug: string; image: string | null }>();
  // The API returns at most 1000 rows per request, so read in pages
  const PAGE = 1000;
  for (let from = 0; from < 20 * PAGE; from += PAGE) {
    const rows = ((await settled(() => supabasePublic().from("product_cards").select("slug, created_at, category_slug, images").order("slug").order("id").range(from, from + PAGE - 1))) ?? []) as Row[];
    for (const r of rows) if (!seen.has(r.slug)) seen.set(r.slug, { slug: r.slug, created_at: r.created_at, category_slug: r.category_slug, image: r.images?.[0] ?? null });
    if (rows.length < PAGE) break;
  }
  return [...seen.values()];
}

/** Groups in the order given, each with all of its variants. */
async function groupsInOrder(groupIds: string[], face: "default" | "first" = "default"): Promise<GroupCard[]> {
  const ids = [...new Set(groupIds)];
  if (!ids.length) return [];
  const rows = await cardRows((q) => q.in("group_id", ids));
  const byGroup = new Map(groupCards(rows, face).map((g) => [g.group_id, g]));
  return ids.map((id) => byGroup.get(id)).filter(Boolean) as GroupCard[];
}

export const getSettings = unstable_cache(
  async (): Promise<StoreSettings | null> => {
    // Errors are thrown (not cached as empty), so one slow moment can't blank the shop for 5 minutes
    return (await settled(() => supabasePublic().from("settings").select("*").eq("id", 1).single())) as StoreSettings | null;
  },
  ["settings-v1"],
  CACHE,
);

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    return ((await settled(() => supabasePublic().from("categories").select("id, name, slug, image_url, icon, sort").order("sort"))) ?? []) as Category[];
  },
  ["categories-v1"],
  CACHE,
);

const homeContent = unstable_cache(
  async () => {
    const sb = supabasePublic();
    const [sections, banners] = await Promise.all([
      settled(() => sb.from("home_sections").select("*").eq("visible", true).order("position")),
      settled(() => sb.from("banners").select("*").order("position")),
    ]);
    return { sections: (sections ?? []) as HomeSection[], banners: (banners ?? []) as Banner[] };
  },
  ["home-content-v1"],
  CACHE,
);

/** `title` is the shelf's sign in the shop; `seo` is how the shelf reads in a search result. */
type Collection = { title: string; seo: string; query: (q: Sel) => Sel };
export const COLLECTIONS: Record<string, Collection> = {
  featured: { title: "Picked for you", seo: "Popular stationery picks in Kohima", query: (q) => q.eq("featured", true).order("sold_count", { ascending: false }) },
  top_discounts: { title: "Biggest savings", seo: "Stationery offers and discounts in Kohima", query: (q) => q.gt("discount_pct", 0).order("discount_pct", { ascending: false }) },
  top_rated: { title: "Top rated", seo: "Top-rated stationery in Kohima", query: (q) => q.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false }) },
  most_purchased: { title: "Most bought in Kohima", seo: "Best-selling stationery in Kohima", query: (q) => q.order("sold_count", { ascending: false }) },
  trending: { title: "Trending this week", seo: "Trending stationery in Kohima this week", query: (q) => q.order("view_count", { ascending: false }) },
  monsoon: { title: "Monsoon ready", seo: "Monsoon-ready stationery in Kohima", query: (q) => q.eq("seasonal_tag", "monsoon").order("sold_count", { ascending: false }) },
};

/** One shelf: the best rows by the shelf's rule (in the database), then their groups with all variants. */
const collectionFrom = unstable_cache(
  async (key: string, limit: number): Promise<GroupCard[]> => {
    const c = COLLECTIONS[key];
    if (!c) return [];
    const rows = await cardRows((q) => c.query(q).limit(limit * 3));
    return groupsInOrder(rows.map((r) => r.group_id).slice(0, limit * 3)).then((g) => g.slice(0, limit));
  },
  ["collection-v3"],
  CACHE,
);

export async function getCollection(key: string, limit = 12) {
  return collectionFrom(key, limit);
}

/** Stable per-day shuffle (India time), so the shop looks different each day but not on every refresh. */
function dailyShuffle<T extends { group_id: string }>(list: T[]): T[] {
  const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const h = (s: string) => { let x = 2166136261; for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return x >>> 0; };
  return [...list].sort((a, b) => h(day + a.group_id) - h(day + b.group_id));
}

export async function getHome() {
  const keys = ["top_discounts", "top_rated", "most_purchased", "trending"] as const;
  const [content, categories, featured, seasonal, ...shelves] = await Promise.all([
    homeContent(), getCategories(), collectionFrom("featured", 40), collectionFrom("monsoon", 12),
    ...keys.map((k) => collectionFrom(k, 12)),
  ]);
  const rails: Record<string, GroupCard[]> = {};
  keys.forEach((k, i) => (rails[k] = shelves[i]));
  // Featured pool: shuffled daily; signed-in shoppers then get their own picks in the browser
  rails.featured = dailyShuffle(featured).slice(0, 12);
  rails.seasonal = seasonal;
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
  const { data: recent } = await sb.from("recently_viewed").select("group_id, viewed_at").eq("user_id", userId).order("viewed_at", { ascending: false }).limit(12);
  return groupsInOrder((recent ?? []).map((r) => r.group_id));
}

const categoryCards = unstable_cache(
  async (categoryId: string) => groupCards(await cardRows((q) => q.eq("category_id", categoryId).order("sold_count", { ascending: false }).limit(1000))),
  ["category-cards-v1"],
  CACHE,
);

export async function getCategoryProducts(slug: string) {
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return null;
  return { category, products: await categoryCards(category.id) };
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

const productBySlug = unstable_cache(
  async (slug: string) => {
    const rows = await cardRows((q) => q.eq("slug", slug));
    if (!rows.length) return null;
    const card = groupCards(rows)[0];
    const [{ data: info }, near] = await Promise.all([
      supabasePublic().from("product_groups").select("description").eq("id", card.group_id).maybeSingle(),
      cardRows((q) => q.eq("category_id", card.category_id).neq("group_id", card.group_id).order("sold_count", { ascending: false }).limit(40)),
    ]);
    return { card, description: (info?.description as string | null) ?? null, similar: groupCards(near).slice(0, 10) };
  },
  ["product-v3"],
  CACHE,
);

export async function getProduct(slug: string) {
  const p = await productBySlug(slug);
  if (!p) return null;
  return { ...p, reviews: await reviewsFor(p.card.group_id) };
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
  const [ids, session] = await Promise.all([searchIds(term).catch(() => [] as string[]), getSessionProfile()]);
  // Hydrate full product rows (stock limits, units, etc.) in the ranked order
  const found = ids.length ? await cardRows((q) => q.in("id", ids)) : [];
  const byId = new Map(found.map((c) => [c.id, c]));
  const rows = ids.map((id) => byId.get(id)).filter(Boolean) as ProductCard[];
  const matches = groupCards(rows, "first");
  let related: GroupCard[] = [];
  if (matches.length) {
    const catIds = [...new Set(matches.slice(0, 3).map((m) => m.category_id))];
    const seen = new Set(matches.map((m) => m.group_id));
    const near = await cardRows((q) => q.in("category_id", catIds).order("sold_count", { ascending: false }).limit(80));
    related = groupCards(near.filter((c) => !seen.has(c.group_id))).slice(0, 12);
  }
  // Search terms are logged for signed-in shoppers only (rate limited on the server)
  if (session.user) await session.supabase.rpc("log_search", { p_term: term, p_results: matches.length });
  return { matches, related };
}

/** Shop links for ordered items (items no longer on sale get none). */
export async function productLinks(ids: string[]): Promise<Record<string, string>> {
  const want = [...new Set(ids)];
  if (!want.length) return {};
  const { data } = await supabasePublic().from("product_cards").select("id, slug").in("id", want);
  const links: Record<string, string> = {};
  for (const c of (data ?? []) as { id: string; slug: string }[]) links[c.id] = `/p/${c.slug}?v=${c.id}`;
  return links;
}
