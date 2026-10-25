import { ImageResponse } from "next/og";
import { ogFonts, markUri } from "@/lib/og/share";

export const alt = "Gupta Enterprises: stationery from Khedi Market, Kohima, delivered in 45-60 minutes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview for the shop: the signboard itself. */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a4d3b", padding: 36 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", border: "4px solid rgba(245,184,0,.55)", borderRadius: 26, padding: "48px 56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <img src={markUri} width={108} height={108} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "Sign", fontSize: 76, color: "#f4faf6", textTransform: "uppercase", lineHeight: 1 }}>Gupta Enterprises</div>
              <div style={{ fontFamily: "Body", fontWeight: 500, fontSize: 30, color: "#a9cfc0", marginTop: 8 }}>Khedi Market, Kohima</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Sign", fontSize: 104, color: "#f5b800", textTransform: "uppercase", lineHeight: 0.95, textShadow: "6px 6px 0 #04261d" }}>Stationery at your door</div>
            <div style={{ display: "flex", gap: 16, marginTop: 28 }}>
              {["45-60 min delivery", "Free store pickup", "UPI or cash"].map((t) => (
                <div key={t} style={{ display: "flex", background: t.startsWith("45") ? "#cf1f2b" : "rgba(255,255,255,.12)", color: "#fff", fontFamily: "Body", fontWeight: 700, fontSize: 28, padding: "12px 22px", borderRadius: 12 }}>{t}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
