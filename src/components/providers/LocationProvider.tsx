"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { haversineKm } from "@/lib/format";

export type DeliveryLocation = { lat: number; lng: number; label: string; source: "gps" | "map" | "address" };
type Status = "unknown" | "locating" | "in_range" | "out_of_range" | "denied";

type Ctx = {
  location: DeliveryLocation | null;
  status: Status;
  distanceKm: number | null;
  store: { lat: number; lng: number; radiusKm: number };
  locate: () => void;
  setLocation: (l: DeliveryLocation) => void;
  dismissed: boolean;
  dismiss: () => void;
};

const LocCtx = createContext<Ctx | null>(null);
const KEY = "gi-location-v1";

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Nominatim usage policy: max 1 request/second, identify the app. We call it once per locate.
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } },
    );
    const j = await r.json();
    const a = j.address ?? {};
    return [a.road || a.neighbourhood || a.suburb, a.city || a.town || a.village || a.county].filter(Boolean).join(", ") || "Current location";
  } catch {
    return "Current location";
  }
}

export function LocationProvider({ store, children }: { store: { lat: number; lng: number; radiusKm: number }; children: React.ReactNode }) {
  const [location, setLoc] = useState<DeliveryLocation | null>(null);
  const [status, setStatus] = useState<Status>("unknown");
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLoc(JSON.parse(raw));
      else setDismissed(sessionStorage.getItem("gi-loc-dismissed") === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const distanceKm = useMemo(() => (location ? haversineKm(location, store) : null), [location, store]);

  useEffect(() => {
    if (!location || distanceKm == null) return;
    // Straight-line distance is only a quick hint; the exact road-distance check
    // (OSRM, 15 km) happens on the server at checkout.
    setStatus(distanceKm <= store.radiusKm ? "in_range" : "out_of_range");
  }, [location, distanceKm, store.radiusKm]);

  const setLocation = useCallback((l: DeliveryLocation) => {
    setLoc(l);
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* ignore */ }
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) return setStatus("denied");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const label = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, label, source: "gps" });
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, [setLocation]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try { sessionStorage.setItem("gi-loc-dismissed", "1"); } catch { /* ignore */ }
  }, []);

  return (
    <LocCtx.Provider value={{ location, status, distanceKm, store, locate, setLocation, dismissed, dismiss }}>
      {children}
    </LocCtx.Provider>
  );
}

export function useLocation() {
  const c = useContext(LocCtx);
  if (!c) throw new Error("useLocation must be inside LocationProvider");
  return c;
}
