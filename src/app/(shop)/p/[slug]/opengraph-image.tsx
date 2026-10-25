import { ImageResponse } from "next/og";
import { getProduct, getCollection } from "@/lib/catalog";
import { rupees } from "@/lib/format";
import { ogFonts, markUri, publicAsDataUri } from "@/lib/og/share";

export const alt = "Product at Gupta Enterprises, Kohima";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export async function generateStaticParams() {
  // Pre-draw the best sellers; the rest are drawn on first share
  try { return (await getCollection("most_purchased", 40)).map((g) => ({ slug: g.slug })); } catch { return []; }
}

/** Link preview for a product: its picture on a white board, name and price painted on the sign. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  const card = p?.card;
  const pic = await publicAsDataUri(card?.images[0]);
  const off = card && card.mrp_paise > card.price_paise ? card.discount_pct : 0;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a4d3b", padding: 36, gap: 36 }}>
        <div style={{ width: 558, height: 558, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 26, position: "relative" }}>
          {pic && <img src={pic} width={470} height={470} alt="" style={{ objectFit: "contain" }} />}
          {off >= 5 && <div style={{ position: "absolute", top: 0, left: 0, display: "flex", background: "#cf1f2b", color: "#fff", fontFamily: "Sign", fontSize: 44, padding: "10px 22px", borderBottomRightRadius: 20, borderTopLeftRadius: 26, textTransform: "uppercase" }}>{off}% off</div>}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8px 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={markUri} width={64} height={64} alt="" />
            <div style={{ fontFamily: "Sign", fontSize: 40, color: "#f4faf6", textTransform: "uppercase" }}>Gupta Enterprises</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Body", fontWeight: 700, fontSize: 28, color: "#a9cfc0" }}>{card?.brand ?? "Stationery"}</div>
            <div style={{ fontFamily: "Sign", fontSize: card && card.name.length > 26 ? 64 : 78, color: "#f4faf6", lineHeight: 1, marginTop: 8 }}>{card?.name ?? "Stationery from Kohima"}</div>
            {card && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 26 }}>
                <div style={{ display: "flex", background: "#f5b800", color: "#1d1600", fontFamily: "Sign", fontSize: 76, padding: "6px 22px 2px", borderRadius: 14, lineHeight: 1 }}>{rupees(card.price_paise)}</div>
                {off > 0 && <div style={{ fontFamily: "Body", fontWeight: 500, fontSize: 32, color: "#a9cfc0", textDecoration: "line-through", marginBottom: 10 }}>{rupees(card.mrp_paise)}</div>}
              </div>
            )}
          </div>
          <div style={{ fontFamily: "Body", fontWeight: 700, fontSize: 28, color: "#f5b800" }}>Delivered in 45-60 min in Kohima</div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
