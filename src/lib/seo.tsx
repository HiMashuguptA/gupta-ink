import type { Metadata } from "next";
import type { Category, GroupCard, StoreSettings } from "./types";

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://guptaenterpriseskohima.com").replace(/\/$/, "");
export const BRAND = "Gupta Enterprises";
export const STREET = "Khedi Market, New NST, opposite Hotel Galaxy";
/** The shop's own verified listing on Google Maps (Google Business Profile). */
export const MAPS_URL = "https://www.google.com/maps?cid=8883433745123250503";

/** Pages behind sign-in or with no search value: kept out of search results, links still followed. */
export const PRIVATE: Metadata["robots"] = { index: false, follow: true };

/** A product, category or page that doesn't exist. The page itself answers 404. */
export const NOT_FOUND: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

/** Trim to a search-snippet length on a word boundary. */
export function clip(text: string, max = 155) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "").replace(/[\s,;:.(&|/-]+$/, "") + "…";
}

/** Search results show about 60 characters of a title; anything longer is cut off by Google. */
const TITLE_MAX = 62;
const DESC_MAX = 155;

/** The first candidate that fits; the last one, trimmed, if none does. */
export function fit(candidates: string[], max: number) {
  return candidates.find((t) => t.length <= max) ?? clip(candidates[candidates.length - 1], max);
}

/**
 * Marketplace-style names ("Indian Economy by N. Singhania | 5th edition | for UPSC …") cut down
 * to the part people actually search for: the text before the first "|", plus any following
 * parts that still fit ("Marker Ink | BLACK INK" keeps its colour, so variants stay distinct).
 */
export function shortName(name: string, max = 200) {
  const parts = name.split("|").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
  let lead = parts[0] ?? name.replace(/\s+/g, " ").trim();
  for (const part of parts.slice(1)) {
    if (`${lead}, ${part}`.length > 60) break;
    lead = `${lead}, ${part}`;
  }
  return clip(lead, max);
}

const rupees = (paise: number) => (paise / 100).toFixed(2);
const inr = (paise: number) => `₹${Math.round(paise / 100)}`;

/**
 * "Classmate Notebook 172 pages: ₹60 in Kohima | Gupta Enterprises" when that fits the visible
 * title length. Long names drop the extras instead of the words that tell two books apart
 * (Google shortens what it shows, but still reads the whole title).
 */
export function productTitle(card: GroupCard) {
  const name = shortName(card.name);
  const price = `: ${inr(card.price_paise)}`;
  const whole = [`${name}${price} in Kohima | ${BRAND}`, `${name}${price} in Kohima`, `${name}${price}`].find((t) => t.length <= TITLE_MAX);
  return whole ?? `${clip(name, 90)}${price}`;
}

/** Price first, then what it is, then how to get it. Built from whole sentences so it is never cut mid-way. */
export function productDescription(card: GroupCard, description: string | null) {
  const offer = `${shortName(card.name, 70)} for ${inr(card.price_paise)}${card.mrp_paise > card.price_paise ? ` (MRP ${inr(card.mrp_paise)})` : ""}.`;
  const about = description ? clip(description.split(/(?<=[.!?])\s/)[0], 70).replace(/[.…]*$/, ".") : "";
  const how = [
    `Order online from ${BRAND}, Kohima: delivery in 45-60 minutes or store pickup.`,
    "Delivered in Kohima in 45-60 minutes, or pick up in store.",
    "Buy online in Kohima.",
  ];
  const join = (...parts: string[]) => parts.filter(Boolean).join(" ");
  return fit([join(offer, about, how[0]), join(offer, how[0]), join(offer, about, how[1]), join(offer, how[1]), join(offer, how[2]), offer], DESC_MAX);
}

/** The brands a shopper will find most of in a list of products. */
function topBrands(products: GroupCard[], max = 3) {
  const count = new Map<string, number>();
  for (const p of products) {
    const b = p.brand?.trim();
    if (b) count.set(b, (count.get(b) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, max).map(([b]) => b);
}
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

export function categoryMeta(cat: Category, products: GroupCard[]): Metadata {
  const brands = topBrands(products);
  const stock = products.length > 1 ? `${products.length} products${brands.length > 1 ? ` from ${list(brands)}` : ""}` : "";
  const lead = `${cat.name} in Kohima${stock ? `: ${stock}` : ""}.`;
  return {
    title: { absolute: fit([`${cat.name}: buy online in Kohima | ${BRAND}`, `${cat.name} in Kohima | ${BRAND}`, `${cat.name} | ${BRAND}`], TITLE_MAX) },
    description: fit([
      `${lead} Order online from ${BRAND}, Khedi Market, for delivery in 45-60 minutes or store pickup.`,
      `${lead} Order online from ${BRAND} for delivery in 45-60 minutes or store pickup.`,
      `${lead} Delivered in 45-60 minutes by ${BRAND}, or pick up in store.`,
      `${cat.name} in Kohima. Delivered in 45-60 minutes by ${BRAND}, or pick up in store.`,
    ], DESC_MAX),
    alternates: { canonical: `/c/${cat.slug}` },
    openGraph: { title: `${cat.name} | ${BRAND}`, url: `/c/${cat.slug}` },
  };
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
    description: clip(description ?? `${shortName(card.name)} from ${BRAND}, Kohima.`, 500),
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
      seller: { "@type": "Organization", name: BRAND, url: SITE },
      // Same rule the product page shows: 3 days for returnable items (see /policies/returns)
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: card.returnable ? "https://schema.org/MerchantReturnFiniteReturnWindow" : "https://schema.org/MerchantReturnNotPermitted",
        ...(card.returnable ? { merchantReturnDays: 3 } : {}),
        merchantReturnLink: `${SITE}/policies/returns`,
      },
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

/** The shop itself, for local search ("stationery shop Kohima"). Tied to its Google Maps listing. */
export function storeJsonLd(s: StoreSettings | null) {
  const hhmm = (t?: string | null) => (t ?? "").slice(0, 5);
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE}/#store`,
    name: s?.store_name ?? BRAND,
    description: "Stationery shop in Khedi Market, Kohima: notebooks, pens, office and school supplies, textbooks and printer ink, delivered in 45-60 minutes or ready for pickup.",
    url: SITE,
    logo: `${SITE}/brand/apple-touch-icon.png`,
    image: `${SITE}/opengraph-image`,
    telephone: s?.store_phone ? `+91${String(s.store_phone).replace(/\D/g, "").slice(-10)}` : undefined,
    email: s?.support_email ?? undefined,
    priceRange: "₹",
    currenciesAccepted: "INR",
    address: {
      "@type": "PostalAddress",
      streetAddress: STREET,
      addressLocality: "Kohima",
      addressRegion: "Nagaland",
      postalCode: "797001",
      addressCountry: "IN",
    },
    geo: { "@type": "GeoCoordinates", latitude: s?.store_lat ?? 25.668, longitude: s?.store_lng ?? 94.1085 },
    hasMap: MAPS_URL,
    sameAs: [MAPS_URL],
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

/** Tells Google what to call the site in results ("Gupta Enterprises", not the domain). */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    url: `${SITE}/`,
    name: BRAND,
    alternateName: ["Gupta Enterprises Kohima", "guptaenterpriseskohima.com"],
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE}/#store` },
  };
}

/** Inline JSON-LD (escaped so product text can't close the script tag). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
