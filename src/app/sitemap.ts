import type { MetadataRoute } from "next";
import { supabasePublic } from "@/lib/supabase/public";
import { COLLECTIONS } from "@/lib/catalog";
import { POLICIES } from "@/content/policies";
import { SITE } from "@/lib/seo";

// Rebuilt at most once an hour
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const sb = supabasePublic();
  const [cats, prods] = await Promise.all([
    sb.from("categories").select("slug"),
    sb.from("product_cards").select("slug, created_at").limit(5000),
  ]);
  const productSlugs = new Map<string, string>();
  for (const p of (prods.data ?? []) as { slug: string; created_at: string }[]) if (!productSlugs.has(p.slug)) productSlugs.set(p.slug, p.created_at);
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...((cats.data ?? []) as { slug: string }[]).map((c) => ({ url: `${SITE}/c/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...Object.keys(COLLECTIONS).map((k) => ({ url: `${SITE}/collections/${k}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
    ...[...productSlugs].map(([slug, at]) => ({ url: `${SITE}/p/${slug}`, lastModified: new Date(at), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...POLICIES.map((p) => ({ url: `${SITE}/policies/${p.slug}`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
