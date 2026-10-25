"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { KeyRound, Navigation } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { haversineKm } from "@/lib/format";
import type { OrderRow } from "@/lib/orders";

const LiveMap = dynamic(() => import("./LiveMap"), { ssr: false, loading: () => <div className="skeleton h-[240px] rounded-[12px]" /> });

type Loc = { lat: number; lng: number; updated_at: string };

/** Live partner position and the hand-over code, shown while the order is on its way. */
export function DeliveryTracker({ order, shop }: { order: OrderRow; shop: { lat: number; lng: number } }) {
  const sb = supabaseBrowser();
  const [loc, setLoc] = useState<Loc | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [, tick] = useState(0);
  const out = order.status === "out_for_delivery";

  useEffect(() => {
    let alive = true;
    void sb.from("agent_locations").select("lat, lng, updated_at").eq("order_id", order.id).maybeSingle()
      .then(({ data }) => { if (alive && data) setLoc(data as Loc); });
    const ch = sb.channel(`agent-loc-${order.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_locations", filter: `order_id=eq.${order.id}` },
        (p) => { const n = p.new as Loc | undefined; if (n?.lat) setLoc({ lat: n.lat, lng: n.lng, updated_at: n.updated_at }); })
      .subscribe();
    const t = setInterval(() => tick((x) => x + 1), 15000);
    return () => { alive = false; clearInterval(t); void sb.removeChannel(ch); };
  }, [sb, order.id]);

  useEffect(() => {
    if (!out) { setCode(null); return; }
    void sb.rpc("my_delivery_code", { p_order: order.id }).then(({ data }) => setCode((data as string | null) ?? null));
  }, [sb, order.id, out]);

  if (!order.address) return null;
  const dest = { lat: order.address.lat, lng: order.address.lng };
  const ageMin = loc ? Math.floor((Date.now() - new Date(loc.updated_at).getTime()) / 60000) : null;
  const fresh = ageMin != null && ageMin < 10;
  const km = loc && fresh ? haversineKm(loc, dest) : null;

  return (
    <section className="mt-4 space-y-3" aria-label="Live delivery">
      {out && (
        <div className="flex items-center gap-3 rounded-[12px] border-[1.5px] border-ink bg-card p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nib-soft"><KeyRound className="size-5 text-ink" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Delivery code</p>
            <p className="text-xs text-muted">Tell it to your partner only once the parcel is in your hands.</p>
          </div>
          <p className="font-display text-3xl font-extrabold tracking-[0.25em] text-ink" aria-live="polite">{code ?? "····"}</p>
        </div>
      )}
      <div className="rounded-[12px] bg-card p-3">
        <LiveMap dest={dest} shop={shop} agent={loc && fresh ? loc : null} />
        <p className="mt-2 flex items-center gap-2 px-1 text-sm">
          <Navigation className="size-4 text-ink" />
          {loc && fresh
            ? <span><b>{km! < 0.2 ? "Almost there" : `About ${km!.toFixed(1)} km away`}</b><span className="text-muted"> · updated {ageMin === 0 ? "just now" : `${ageMin} min ago`}</span></span>
            : <span className="text-muted">Your partner&apos;s location shows here once they set off.</span>}
        </p>
      </div>
    </section>
  );
}
