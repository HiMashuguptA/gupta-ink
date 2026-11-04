import "server-only";
import { createHmac } from "node:crypto";
import { haversineKm } from "./format";

/**
 * Road distance from the store: Google Routes API (GOOGLE_ROUTES_KEY), else OSRM, else a
 * conservative estimate (straight line × 1.4, typical for Kohima's winding roads).
 */
export async function roadDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const g = await googleDistanceKm(from, to);
  if (g != null) return { km: round2(g), approx: false };
  const base = (process.env.OSRM_URL ?? "https://router.project-osrm.org").replace(/\/$/, "");
  const url = `${base}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&alternatives=false`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "GuptaEnterprises/1.0 (guptaenterpriseskohima@gmail.com)" }, cache: "no-store" });
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

async function googleDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const key = process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_ROUTES_KEY;
  if (!key) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST", signal: ctrl.signal, cache: "no-store",
      headers: { "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "routes.distanceMeters" },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: "DRIVE",
      }),
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = (await res.json()) as { routes?: { distanceMeters?: number }[] };
    const m = j.routes?.[0]?.distanceMeters;
    return typeof m === "number" ? m / 1000 : null;
  } catch {
    return null;
  }
}

export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Must produce exactly the string the database checks in _distance_sig_ok(). */
let cachedKey: string | null = null;
async function distanceKey() {
  if (process.env.DISTANCE_SIGNING_KEY) return process.env.DISTANCE_SIGNING_KEY;
  if (cachedKey) return cachedKey;
  // Same key the database uses in _distance_sig_ok(), read with the server-only secret key
  const { secret } = await import("@/lib/admin-db");
  const k = await secret("distance_hmac");
  if (!k) throw new Error("The distance signing key is missing in the database");
  return (cachedKey = k);
}

export async function signDistance(id: string, lat: number, lng: number, km: number) {
  const key = await distanceKey();
  const msg = `${id}|${lat.toFixed(6)}|${lng.toFixed(6)}|${km.toFixed(2)}`;
  return createHmac("sha256", key).update(msg).digest("hex");
}
