import type { MetadataRoute } from "next";
import { allProductSlugs, COLLECTIONS, getCategories } from "@/lib/catalog";
import { POLICIES } from "@/content/policies";
import { SITE } from "@/lib/seo";

// Rebuilt at most once an hour
export const revalidate = 3600;

const absolute = (src: string) => (src.startsWith("http") ? src : `${SITE}${src.startsWith("/") ? "" : "/"}${src}`);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cats, products] = await Promise.all([getCategories(), allProductSlugs()]);
  // "Last changed" is the newest product a page shows, so the date only moves when the page does
  const newestIn = new Map<string, number>();
  let newest = 0;
  for (const p of products) {
    const at = Date.parse(p.created_at) || 0;
    newest = Math.max(newest, at);
    newestIn.set(p.category_slug, Math.max(newestIn.get(p.category_slug) ?? 0, at));
  }
  const day = (ms: number) => (ms ? new Date(ms) : undefined);
  return [
    { url: `${SITE}/`, lastModified: day(newest), changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/categories`, lastModified: day(newest), changeFrequency: "weekly", priority: 0.8 },
    ...cats.map((c) => ({ url: `${SITE}/c/${c.slug}`, lastModified: day(newestIn.get(c.slug) ?? 0), changeFrequency: "daily" as const, priority: 0.8 })),
    ...Object.keys(COLLECTIONS).map((k) => ({ url: `${SITE}/collections/${k}`, lastModified: day(newest), changeFrequency: "daily" as const, priority: 0.5 })),
    ...products.map((p) => ({
      url: `${SITE}/p/${p.slug}`, lastModified: day(Date.parse(p.created_at) || 0), changeFrequency: "weekly" as const, priority: 0.7,
      ...(p.image ? { images: [absolute(p.image)] } : {}),
    })),
    ...POLICIES.map((p) => ({ url: `${SITE}/policies/${p.slug}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
