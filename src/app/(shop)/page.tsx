import { getHome, getSettings } from "@/lib/catalog";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { JsonLd, MAPS_URL, STREET, storeJsonLd, websiteJsonLd } from "@/lib/seo";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { PromoTiles } from "@/components/home/PromoTiles";
import { FactsTicker } from "@/components/home/FactsTicker";
import { Rail } from "@/components/shop/Rail";
import { PickedForYou, RecentlyViewed } from "@/components/home/PersonalRails";

// Same page for everyone, rebuilt every 5 minutes (and right after admin edits), served
// from the CDN. Personal rails fill in from the browser.
export const revalidate = 300;

export const metadata = {
  title: { absolute: "Stationery Shop in Kohima: 60-Min Delivery | Gupta Enterprises" },
  description: "Stationery shop in Khedi Market, Kohima. Notebooks, pens, files, textbooks and office supplies online: delivered in 45-60 minutes, or pick up in store.",
  alternates: { canonical: "/" },
};

const RAIL_LINKS: Record<string, string> = {
  featured: "/collections/featured",
  top_discounts: "/collections/top_discounts",
  top_rated: "/collections/top_rated",
  most_purchased: "/collections/most_purchased",
  trending: "/collections/trending",
  seasonal: "/collections/monsoon",
};

export default async function Home() {
  const [home, settings] = await Promise.all([getHome(), getSettings()]);

  // Admin controls which sections show and in what order (home_sections table)
  const sections = home.sections.length
    ? home.sections
    : ["featured", "top_discounts", "promos", "categories", "recent", "top_rated", "most_purchased", "trending", "seasonal"].map((key, i) => ({ key, title: "", position: i, visible: true, config: {} }));

  return (
    <>
      <JsonLd data={storeJsonLd(settings)} />
      <JsonLd data={websiteJsonLd()} />
      <h1 className="sr-only">Gupta Enterprises: stationery shop in Kohima, delivered in 45-60 minutes</h1>
      <HeroCarousel banners={home.hero} />
      <FactsTicker s={settings} />
      {sections.map((s) => {
        switch (s.key) {
          case "promos":
            return <PromoTiles key={s.key} promos={home.promos} />;
          case "categories":
            return <CategoryGrid key={s.key} categories={home.categories} title={s.title || undefined} />;
          case "recent":
            return <RecentlyViewed key={s.key} title={s.title || "Recently viewed"} />;
          case "featured":
            return <PickedForYou key={s.key} title={s.title || "Picked for you"} href={RAIL_LINKS.featured} initial={home.rails.featured ?? []} />;
          default: {
            const cards = home.rails[s.key] ?? [];
            return <Rail key={s.key} title={s.title} href={RAIL_LINKS[s.key]} cards={cards} />;
          }
        }
      })}
      {/* Who we are and where, in plain words: for a first-time visitor and for local search */}
      {home.categories.length > 0 && (
        <section className="mt-9 px-4" aria-labelledby="about-shop">
          <div className="rounded-[14px] bg-card p-5 sm:p-6">
            <h2 id="about-shop" className="t-h3 uppercase leading-none text-graphite">Your stationery shop in Kohima</h2>
            <p className="mt-3 max-w-[68ch] text-muted">
              Gupta Enterprises is a stationery shop at {STREET}, Kohima. Order online and we bring it to your door in{" "}
              {settings?.quick_eta_min ?? 45}-{settings?.quick_eta_max ?? 60} minutes, anywhere within {Number(settings?.delivery_radius_km ?? 15)} km of the shop, or keep it ready for you at the counter.
            </p>
            <p className="mt-2 max-w-[68ch] text-muted">
              On the shelves:{" "}
              {home.categories.map((c, i) => (
                <span key={c.id}>
                  <Link href={`/c/${c.slug}`} className="font-semibold text-ink hover:underline">{c.name}</Link>
                  {i < home.categories.length - 1 ? ", " : "."}
                </span>
              ))}
            </p>
            <a href={MAPS_URL} target="_blank" rel="noopener" className="press mt-4 inline-flex h-10 items-center gap-1.5 rounded-[9px] bg-sign px-3.5 text-sm font-bold text-on-sign hover:bg-ink">
              <MapPin className="size-4 text-nib" aria-hidden /> Find us on Google Maps
            </a>
          </div>
        </section>
      )}
      {!home.categories.length && (
        <div className="mx-4 mt-8 rounded-[14px] bg-card p-8">
          <h2 className="text-xl font-bold">The shelves are empty</h2>
          <p className="mt-1 text-muted">Load the test catalogue (supabase/seed.sql) or add products from the admin panel.</p>
        </div>
      )}
    </>
  );
}
