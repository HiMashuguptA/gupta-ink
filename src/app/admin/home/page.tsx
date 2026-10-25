import { getSessionProfile } from "@/lib/supabase/server";
import { HomeEditor, type BannerRow, type SectionRow } from "./HomeEditor";

export const metadata = { title: "Home page" };

export default async function AdminHome() {
  const { supabase } = await getSessionProfile();
  const [banners, sections, cats, groups] = await Promise.all([
    supabase.from("banners").select("*").order("position"),
    supabase.from("home_sections").select("*").order("position"),
    supabase.from("categories").select("slug, name").order("sort"),
    supabase.from("product_groups").select("slug, name").order("name"),
  ]);
  return (
    <div className="max-w-5xl">
      <h1 className="text-[34px] uppercase">Home page</h1>
      <p className="mt-1 text-sm text-muted">Carousel banners, promo tiles and the order of sections customers see. Changes show in the shop straight away.</p>
      <HomeEditor banners={(banners.data ?? []) as unknown as BannerRow[]} sections={(sections.data ?? []) as unknown as SectionRow[]}
        categories={cats.data ?? []} products={groups.data ?? []} />
    </div>
  );
}
