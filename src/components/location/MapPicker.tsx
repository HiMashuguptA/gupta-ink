"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, Circle, useMapEvents, useMap } from "react-leaflet";
import { useEffect, useMemo, useRef } from "react";

const pin = L.divIcon({
  className: "",
  html: `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg"><path d="M18 45c-1-6-16-17-16-28a16 16 0 0 1 32 0c0 11-15 22-16 28z" fill="#1f2a6e" stroke="#fff" stroke-width="2"/><circle cx="18" cy="17" r="6" fill="#e9a23b"/></svg>`,
  iconSize: [36, 46],
  iconAnchor: [18, 45],
});

const shop = L.divIcon({
  className: "",
  html: `<div style="background:#e9a23b;color:#141c4d;font:700 11px Figtree Variable,sans-serif;padding:4px 8px;border-radius:10px;border:2px solid #fff;white-space:nowrap;box-shadow:0 2px 6px rgba(20,28,77,.3)">Gupta Ink store</div>`,
  iconSize: [100, 24],
  iconAnchor: [50, 12],
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
    map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export default function MapPicker({
  value, onChange, store, radiusKm, height = 300,
}: {
  value: { lat: number; lng: number };
  onChange: (lat: number, lng: number) => void;
  store: { lat: number; lng: number };
  radiusKm: number;
  height?: number;
}) {
  const handlers = useMemo(() => ({
    dragend(e: L.LeafletEvent) {
      const m = e.target as L.Marker;
      const p = m.getLatLng();
      onChange(p.lat, p.lng);
    },
  }), [onChange]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line" style={{ height }}>
      <MapContainer center={[value.lat, value.lng]} zoom={16} className="size-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Circle center={[store.lat, store.lng]} radius={radiusKm * 1000} pathOptions={{ color: "#1f2a6e", weight: 1, fillOpacity: 0.04 }} />
        <Marker position={[store.lat, store.lng]} icon={shop} interactive={false} />
        <Marker position={[value.lat, value.lng]} icon={pin} draggable eventHandlers={handlers} />
        <ClickToMove onPick={onChange} />
        <Recenter lat={value.lat} lng={value.lng} />
      </MapContainer>
    </div>
  );
}
