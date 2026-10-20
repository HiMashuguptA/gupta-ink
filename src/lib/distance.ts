import "server-only";
import { createHmac } from "node:crypto";
import { haversineKm } from "./format";

/**
 * Road distance from the store, via OSRM. Falls back to a conservative estimate
 * (straight line × 1.4, typical for Kohima's winding roads) if the router is down.
 */
export async function roadDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const base = (process.env.OSRM_URL ?? "https://router.project-osrm.org").replace(/\/$/, "");
  const url = `${base}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&alternatives=false`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "GuptaInk/1.0 (guptaenterpriseskohima@gmail.com)" }, cache: "no-store" });
    clearTimeout(t);
    if (res.ok) {
      const j = (await res.json()) as { code?: string; routes?: { distance: number }[] };
      if (j.code === "Ok" && j.routes?.[0]) return { km: round2(j.routes[0].distance / 1000), approx: false };
    }
  } catch {
    // fall through to the estimate
  }
  return { km: round2(haversineKm(from, to) * 1.4), approx: true };
}

export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Must produce exactly the string the database checks in _distance_sig_ok(). */
export function signDistance(id: string, lat: number, lng: number, km: number) {
  const key = process.env.DISTANCE_SIGNING_KEY;
  if (!key) throw new Error("DISTANCE_SIGNING_KEY is not set in .env.local");
  const msg = `${id}|${lat.toFixed(6)}|${lng.toFixed(6)}|${km.toFixed(2)}`;
  return createHmac("sha256", key).update(msg).digest("hex");
}
