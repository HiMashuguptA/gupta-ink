// Product feed for Google Merchant Center (free listings in Google Shopping and Search).
// Merchant Center fetches https://guptaenterpriseskohima.com/feed.xml once a day.
// One item per variant; variants of one product share item_group_id.
import { supabasePublic } from "@/lib/supabase/public";
import { SITE, BRAND, shortName } from "@/lib/seo";
import type { ProductCard } from "@/lib/types";

export const revalidate = 3600;

const esc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (src: string) => (src.startsWith("http") ? src : `${SITE}${src.startsWith("/") ? "" : "/"}${src}`);
const rs = (paise: number) => `${(paise / 100).toFixed(2)} INR`;

async function all<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabasePublic().from(table as "product_cards").select(columns).order("id").range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function GET() {
  const [cards, groups] = await Promise.all([
    all<ProductCard>("product_cards", "*"),
    all<{ id: string; description: string | null }>("product_groups", "id, description"),
  ]);
  const desc = new Map(groups.map((g) => [g.id, g.description?.trim() || ""]));
  const perGroup = new Map<string, number>();
  for (const c of cards) perGroup.set(c.group_id, (perGroup.get(c.group_id) ?? 0) + 1);

  const items: string[] = [];
  for (const c of cards) {
    const img = c.images?.[0];
    if (!img || !c.price_paise) continue; // Google rejects items without a photo or price
    const multi = (perGroup.get(c.group_id) ?? 1) > 1;
    const variant = [c.variant_label, c.colour].filter(Boolean).join(" ");
    const title = shortName(`${c.name}${multi && variant ? `, ${variant}` : ""}`, 150);
    const about =
      desc.get(c.group_id) ||
      `${shortName(c.name, 200)}${c.brand ? ` by ${c.brand}` : ""}. Buy online from ${BRAND}, Khedi Market, Kohima: delivered in 45-60 minutes or ready for store pickup.`;
    const onSale = c.mrp_paise > c.price_paise;
    items.push(`<item>
<g:id>${esc(c.sku || c.id)}</g:id>
<g:item_group_id>${esc(c.group_id)}</g:item_group_id>
<g:title>${esc(title)}</g:title>
<g:description>${esc(about.slice(0, 4900))}</g:description>
<g:link>${esc(`${SITE}/p/${c.slug}${multi ? `?v=${c.id}` : ""}`)}</g:link>
<g:image_link>${esc(abs(img))}</g:image_link>
${c.images.slice(1, 6).map((i) => `<g:additional_image_link>${esc(abs(i))}</g:additional_image_link>`).join("\n")}
<g:availability>${c.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
<g:price>${rs(onSale ? c.mrp_paise : c.price_paise)}</g:price>
${onSale ? `<g:sale_price>${rs(c.price_paise)}</g:sale_price>` : ""}
<g:condition>new</g:condition>
${c.brand ? `<g:brand>${esc(c.brand)}</g:brand>` : ""}
<g:identifier_exists>no</g:identifier_exists>
<g:product_type>${esc(c.category_name)}</g:product_type>
</item>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(BRAND)}</title>
<link>${SITE}</link>
<description>Stationery from ${esc(BRAND)}, Kohima</description>
${items.join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
