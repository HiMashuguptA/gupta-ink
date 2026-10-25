"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";

type Pt = { lat: number; lng: number };

const home = L.divIcon({
  className: "",
  html: `<svg width="32" height="40" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg"><path d="M18 45c-1-6-16-17-16-28a16 16 0 0 1 32 0c0 11-15 22-16 28z" fill="#0b5a45" stroke="#fff" stroke-width="2"/><path d="M11 19l7-6 7 6v7h-5v-4h-4v4h-5z" fill="#fff"/></svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 39],
});
const store = L.divIcon({
  className: "",
  html: `<div style="background:#f5b800;color:#0a3329;font:700 11px Schibsted Grotesk Variable,sans-serif;padding:3px 7px;border-radius:9px;border:2px solid #fff;white-space:nowrap">Store</div>`,
  iconSize: [44, 22],
  iconAnchor: [22, 11],
});
const rider = L.divIcon({
  className: "gi-rider",
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#f5b800;border:3px solid #fff;box-shadow:0 0 0 6px rgba(233,162,59,.3),0 3px 10px rgba(20,28,77,.35);display:grid;place-items:center">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a3329" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Keeps everything in view; follows the rider once they move
function Fit({ points }: { points: Pt[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  const first = useRef(true);
  useEffect(() => {
    const b = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    if (first.current) { map.fitBounds(b, { padding: [36, 36], maxZoom: 16 }); first.current = false; }
    else map.flyToBounds(b, { padding: [36, 36], maxZoom: 16, duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function LiveMap({ dest, shop, agent, height = 240 }: { dest: Pt; shop: Pt; agent: Pt | null; height?: number }) {
  const pts = agent ? [dest, agent] : [dest, shop];
  return (
    <div className="overflow-hidden rounded-[12px] border border-line" style={{ height }}>
      <MapContainer center={[dest.lat, dest.lng]} zoom={14} className="size-full" scrollWheelZoom={false} attributionControl>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <Marker position={[shop.lat, shop.lng]} icon={store} interactive={false} />
        <Marker position={[dest.lat, dest.lng]} icon={home} interactive={false} />
        {agent && <Marker position={[agent.lat, agent.lng]} icon={rider} interactive={false} zIndexOffset={1000} />}
        <Fit points={pts} />
      </MapContainer>
    </div>
  );
}
