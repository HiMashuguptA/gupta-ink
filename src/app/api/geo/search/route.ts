import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geo";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").trim().slice(0, 120);
  const lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
  if (q.length < 3 || !Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json([]);
  return NextResponse.json(await searchPlaces(q, { lat, lng }), { headers: { "cache-control": "private, max-age=300" } });
}
