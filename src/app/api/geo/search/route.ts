import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geo";
import { allow, clientIp, tooMany } from "@/lib/rate-limit";

export async function GET(req: Request) {
  if (!allow(`geo-search:${clientIp(req)}`, 40, 60)) return tooMany();
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").trim().slice(0, 120);
  const lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
  if (q.length < 3 || !Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json([]);
  return NextResponse.json(await searchPlaces(q, { lat, lng }), { headers: { "cache-control": "private, max-age=300" } });
}
