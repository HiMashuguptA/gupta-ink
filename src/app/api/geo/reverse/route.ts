import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geo";
import { allow, clientIp, tooMany } from "@/lib/rate-limit";

export async function GET(req: Request) {
  if (!allow(`geo-rev:${clientIp(req)}`, 20, 60)) return tooMany();
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return NextResponse.json({ name: "" });
  return NextResponse.json({ name: await reverseGeocode(lat, lng) }, { headers: { "cache-control": "private, max-age=600" } });
}
