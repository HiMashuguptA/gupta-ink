import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geo";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return NextResponse.json({ name: "" });
  return NextResponse.json({ name: await reverseGeocode(lat, lng) }, { headers: { "cache-control": "private, max-age=600" } });
}
