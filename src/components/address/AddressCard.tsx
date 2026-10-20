import { MapPin } from "lucide-react";
import clsx from "clsx";
import type { SavedAddress } from "@/app/actions/addresses";

export function AddressCard({ a, radiusKm, selected, children }: { a: SavedAddress; radiusKm: number; selected?: boolean; children?: React.ReactNode }) {
  const out = a.road_km != null && a.road_km > radiusKm;
  return (
    <div className={clsx("flex gap-3 rounded-2xl border p-3.5", selected ? "border-ink bg-ink-soft/60 ring-1 ring-ink" : "border-line bg-card")}>
      <MapPin className={clsx("mt-0.5 size-5 shrink-0", out ? "text-margin" : "text-ink")} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {a.label}
          {a.is_default && <span className="rounded bg-paper px-1.5 py-0.5 text-[11px] text-muted">Default</span>}
          {a.for_someone_else && <span className="rounded bg-nib-soft px-1.5 py-0.5 text-[11px]">For {a.contact_name}</span>}
        </p>
        <p className="text-sm text-muted">{a.house_name}, {a.road}{a.landmark ? `, near ${a.landmark}` : ""}</p>
        <p className="text-sm text-muted">{a.contact_name}, {a.contact_phone}</p>
        {a.road_km != null && (
          <p className={clsx("mt-1 text-xs font-semibold", out ? "text-margin" : "text-ok")}>
            {out ? `${a.road_km.toFixed(1)} km by road: outside delivery area, pickup only` : `${a.road_km.toFixed(1)} km by road`}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
