import type { Metadata } from "next";
import type { GroupCard, StoreSettings } from "./types";

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://guptaenterpriseskohima.com").replace(/\/$/, "");

/** Pages behind sign-in or with no search value: kept out of search results, links still followed. */
export const PRIVATE: Metadata["robots"] = { index: false, follow: true };

/** Trim to a search-snippet length on a word boundary. */
export function clip(text: string, max = 155) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

const rupees = (paise: number) => (paise / 100).toFixed(2);
const inr = (paise: number) => `₹${Math.round(paise / 100)}`;

/** "Classmate Notebook 172 pages: ₹60 in Kohima. Delivered in 45-60 min…" */
export function productDescription(card: GroupCard, description: string | null) {
  const lead = description ? clip(description, 80) + " " : "";
  return clip(`${card.name} for ${inr(card.price_paise)}${card.mrp_paise > card.price_paise ? ` (MRP ${inr(card.mrp_paise)})` : ""}. ${lead}Order online from Gupta Enterprises, Kohima: delivery in 45-60 minutes or store pickup.`);
}

/** Product structured data (Google merchant listing fields). */
export function productJsonLd(card: GroupCard, description: string | null, url: string) {
  const inStock = card.variants.some((v) => v.stock > 0);
  const images = [...new Set(card.variants.flatMap((v) => v.images))].slice(0, 6).map((i) => (i.startsWith("http") ? i : `${SITE}${i.startsWith("/") ? "" : "/"}${i}`));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: card.name,
    sku: card.sku,
    image: images.length ? images : [`${SITE}/opengraph-image`],
    description: clip(description ?? `${card.name} from Gupta Enterprises, Kohima.`, 500),
    ...(card.brand ? { brand: { "@type": "Brand", name: card.brand } } : {}),
    category: card.category_name,
    ...(card.rating_count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(card.rating_avg).toFixed(1), reviewCount: card.rating_count } } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: rupees(card.price_paise),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Gupta Enterprises" },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE}${it.path}` })),
  };
}

/** The shop itself, for local search ("stationery shop Kohima"). */
export function storeJsonLd(s: StoreSettings | null) {
  const hhmm = (t?: string | null) => (t ?? "").slice(0, 5);
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE}/#store`,
    name: s?.store_name ?? "Gupta Enterprises",
    url: SITE,
    logo: `${SITE}/brand/apple-touch-icon.png`,
    image: `${SITE}/opengraph-image`,
    telephone: s?.store_phone ? `+91${String(s.store_phone).replace(/\D/g, "").slice(-10)}` : undefined,
    email: s?.support_email ?? undefined,
    priceRange: "₹",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Khedi Market, New NST, opposite Hotel Galaxy",
      addressLocality: "Kohima",
      addressRegion: "Nagaland",
      postalCode: "797001",
      addressCountry: "IN",
    },
    geo: { "@type": "GeoCoordinates", latitude: s?.store_lat ?? 25.668, longitude: s?.store_lng ?? 94.1085 },
    ...(s?.store_open && s?.store_close ? {
      openingHoursSpecification: [{
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: hhmm(s.store_open), closes: hhmm(s.store_close),
      }],
    } : {}),
    areaServed: { "@type": "City", name: "Kohima" },
  };
}

/** Inline JSON-LD (escaped so product text can't close the script tag). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
