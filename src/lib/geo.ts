/** Place search and reverse geocoding: Google Maps Platform when GOOGLE_MAPS_KEY is set, else OpenStreetMap. */
export type Hit = { name: string; lat: number; lng: number };

const key = () => process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_ROUTES_KEY || "";

async function timed(url: string, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

export async function searchPlaces(q: string, near: { lat: number; lng: number }): Promise<Hit[]> {
  const k = key();
  if (k) {
    try {
      const r = await timed("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "content-type": "application/json", "X-Goog-Api-Key": k, "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location" },
        body: JSON.stringify({ textQuery: q, regionCode: "IN", languageCode: "en", pageSize: 6, locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 25000 } } }),
      });
      if (r.ok) {
        const j = (await r.json()) as { places?: { displayName?: { text?: string }; formattedAddress?: string; location?: { latitude: number; longitude: number } }[] };
        const hits = (j.places ?? []).filter((p) => p.location).map((p) => ({
          name: [p.displayName?.text, p.formattedAddress?.split(", ").slice(0, 2).join(", ")].filter(Boolean).join(", "),
          lat: p.location!.latitude, lng: p.location!.longitude,
        }));
        if (hits.length) return hits;
      }
    } catch { /* fall back */ }
  }
  try {
    const box = [near.lng - 0.25, near.lat + 0.25, near.lng + 0.25, near.lat - 0.25].join(",");
    const r = await timed(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=in&viewbox=${box}&bounded=1&q=${encodeURIComponent(q)}`, { headers: { "Accept-Language": "en", "User-Agent": "GuptaEnterprises/1.0" } });
    const list = (await r.json()) as { display_name: string; lat: string; lon: string }[];
    return list.map((x) => ({ name: x.display_name.split(", ").slice(0, 3).join(", "), lat: Number(x.lat), lng: Number(x.lon) }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const k = key();
  if (k) {
    try {
      const r = await timed(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${k}`);
      if (r.ok) {
        const j = (await r.json()) as { results?: { address_components: { long_name: string; types: string[] }[] }[] };
        const c = j.results?.[0]?.address_components ?? [];
        const pick = (...t: string[]) => c.find((x) => t.some((y) => x.types.includes(y)))?.long_name;
        const s = [pick("route", "premise"), pick("sublocality", "neighborhood", "sublocality_level_1"), pick("locality")].filter(Boolean).join(", ");
        if (s) return s;
      }
    } catch { /* fall back */ }
  }
  try {
    const r = await timed(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "en", "User-Agent": "GuptaEnterprises/1.0" } });
    const a = (await r.json()).address ?? {};
    return [a.road, a.neighbourhood || a.suburb || a.quarter, a.city || a.town || a.village].filter(Boolean).join(", ");
  } catch {
    return "";
  }
}
