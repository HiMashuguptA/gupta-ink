import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/** Headline number with change against the previous period of the same length. */
export function StatTile({ label, value, now, before, hint }: { label: string; value: string; now?: number; before?: number; hint?: string }) {
  let delta: { pct: number; dir: "up" | "down" | "flat" } | null = null;
  if (now != null && before != null) {
    if (before === 0) delta = now === 0 ? { pct: 0, dir: "flat" } : null;
    else { const pct = Math.round(((now - before) / before) * 100); delta = { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" }; }
  }
  const Icon = delta?.dir === "up" ? ArrowUpRight : delta?.dir === "down" ? ArrowDownRight : Minus;
  return (
    <div className="rounded-[12px] bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold tabular-nums sm:text-2xl">{value}</p>
      {delta ? (
        <p className="mt-1 text-xs text-muted">
          <span className="inline-flex items-center gap-0.5 whitespace-nowrap font-semibold text-graphite"><Icon className="size-3.5" aria-hidden />{delta.dir === "flat" ? "No change" : `${delta.dir === "up" ? "Up" : "Down"} ${Math.abs(delta.pct)}%`}</span> vs previous period
        </p>
      ) : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : now != null && before === 0 && now > 0 ? <p className="mt-1 text-xs text-muted">New this period</p> : null}
    </div>
  );
}
