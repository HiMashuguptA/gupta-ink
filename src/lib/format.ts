import type { GroupCard, ProductCard } from "./types";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** Format paise as rupees, e.g. 4900 -> ₹49 */
export function rupees(paise: number) {
  return inr.format(paise / 100);
}

/**
 * Collapse variant rows into one card per product group, keeping the order groups
 * first appear in. The card's face is the default variant (lowest sort), or with
 * face: "first", the first row seen (used by search, so "blue pen" shows the blue one).
 */
export function groupCards(rows: ProductCard[], face: "default" | "first" = "default"): GroupCard[] {
  const map = new Map<string, ProductCard[]>();
  for (const r of rows) {
    const list = map.get(r.group_id);
    if (list) list.push(r);
    else map.set(r.group_id, [r]);
  }
  return [...map.values()].map((list) => {
    const variants = [...list].sort((a, b) => (a.variant_sort ?? 0) - (b.variant_sort ?? 0));
    const top = face === "first" ? list[0] : variants[0];
    return { ...top, variants };
  });
}

/** Straight-line distance in km (used as a quick hint; the server checks road distance). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function linkFor(type: string, value: string | null) {
  switch (type) {
    case "product": return `/p/${value}`;
    case "category": return `/c/${value}`;
    case "search": return `/search?q=${encodeURIComponent(value ?? "")}`;
    case "featured": return "/collections/featured";
    case "url": return value && value.startsWith("/") ? value : "/";
    default: return "/";
  }
}

/** Public URL for a file in a public storage bucket (full URLs pass through). */
export const storageUrl = (bucket: string, path: string) =>
  path.startsWith("http") ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
