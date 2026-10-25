"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, Circle, useMapEvents, useMap } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";

const pin = L.divIcon({
  className: "",
  html: `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg"><path d="M18 45c-1-6-16-17-16-28a16 16 0 0 1 32 0c0 11-15 22-16 28z" fill="#1f2a6e" stroke="#fff" stroke-width="2"/><circle cx="18" cy="17" r="6" fill="#e9a23b"/></svg>`,
  iconSize: [36, 46],
  iconAnchor: [18, 45],
});

const shop = L.divIcon({
  className: "",
  html: `<div style="background:#e9a23b;color:#141c4d;font:700 11px Figtree Variable,sans-serif;padding:4px 8px;border-radius:10px;border:2px solid #fff;white-space:nowrap;box-shadow:0 2px 6px rgba(20,28,77,.3)">Gupta Enterprises</div>`,
  iconSize: [124, 24],
  iconAnchor: [62, 12],
});

function ClickToMove({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const c = map.getCenter();
    // Already there (the map itself reported this spot): don't pan again
    if (Math.abs(c.lat - lat) < 1e-6 && Math.abs(c.lng - lng) < 1e-6) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 17), { animate: true });
  }, [lat, lng, map]);
  return null;
}

/** "Move the map, not the pin": the centre of the map is the chosen spot. */
function CenterTracker({ onPick, onMoving }: { onPick: (lat: number, lng: number) => void; onMoving: (m: boolean) => void }) {
  const map = useMapEvents({
    movestart: () => onMoving(true),
    moveend: () => { onMoving(false); const c = map.getCenter(); onPick(c.lat, c.lng); },
  });
  return null;
}

export default function MapPicker({
  value, onChange, store, radiusKm, height = 300, mode = "drag", className,
}: {
  value: { lat: number; lng: number };
  onChange: (lat: number, lng: number) => void;
  store: { lat: number; lng: number };
  radiusKm: number;
  height?: number | string;
  /** "center": a fixed pin sits in the middle and the shopper moves the map under it (most accurate on phones) */
  mode?: "drag" | "center";
  className?: string;
}) {
  const [moving, setMoving] = useState(false);
  const handlers = useMemo(() => ({
    dragend(e: L.LeafletEvent) {
      const m = e.target as L.Marker;
      const p = m.getLatLng();
      onChange(p.lat, p.lng);
    },
  }), [onChange]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line ${className ?? ""}`} style={{ height }}>
      <MapContainer center={[value.lat, value.lng]} zoom={mode === "center" ? 17 : 16} className="size-full" scrollWheelZoom={mode === "center" ? "center" : false} touchZoom={mode === "center" ? "center" : true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Circle center={[store.lat, store.lng]} radius={radiusKm * 1000} pathOptions={{ color: "#1f2a6e", weight: 1, fillOpacity: 0.04 }} />
        <Marker position={[store.lat, store.lng]} icon={shop} interactive={false} />
        {mode === "drag" ? (
          <>
            <Marker position={[value.lat, value.lng]} icon={pin} draggable eventHandlers={handlers} />
            <ClickToMove onPick={onChange} />
          </>
        ) : (
          <CenterTracker onPick={onChange} onMoving={setMoving} />
        )}
        <Recenter lat={value.lat} lng={value.lng} />
      </MapContainer>
      {mode === "center" && (
        <div className="pointer-events-none absolute inset-0 z-[500] grid place-items-center" aria-hidden>
          <div className="relative -translate-y-[25px]">
            <svg width="40" height="50" viewBox="0 0 36 46" className="drop-shadow-md transition-transform duration-150" style={{ transform: moving ? "translateY(-10px)" : "none" }}>
              <path d="M18 45c-1-6-16-17-16-28a16 16 0 0 1 32 0c0 11-15 22-16 28z" fill="#1f2a6e" stroke="#fff" strokeWidth="2" />
              <circle cx="18" cy="17" r="6" fill="#e9a23b" />
            </svg>
            <span className={`absolute left-1/2 top-full block h-1.5 -translate-x-1/2 rounded-full bg-black/30 transition-all ${moving ? "w-2 opacity-40" : "w-4 opacity-70"}`} />
          </div>
        </div>
      )}
    </div>
  );
}
