"use client";
import { useId, useMemo, useState } from "react";
import { rupeesWhole as rupees, rupeesShort } from "@/lib/format";

export type Column = { key: string; label: string; value: number; detail?: string };

/** Nice round top for the y-axis so gridlines land on friendly numbers. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/**
 * One-series column chart (time or hour of day). Bars grow from the baseline,
 * hover or focus shows the exact value, and a table view sits underneath.
 */
export function ColumnChart({ data, kind, height = 200, labelEvery, caption }: {
  data: Column[]; kind: "rupees" | "count"; height?: number; labelEvery?: number; caption: string;
}) {
  const format = kind === "rupees" ? rupees : (v: number) => v.toLocaleString("en-IN");
  const axis = kind === "rupees" ? rupeesShort : (v: number) => (Number.isInteger(v) ? v.toLocaleString("en-IN") : "");
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.value))), [data]);
  const ticks = [max, max / 2, 0];
  const every = labelEvery ?? Math.max(1, Math.ceil(data.length / 8));
  const a = active != null ? data[active] : null;

  return (
    <figure className="m-0">
      <div className="relative flex gap-2" style={{ height }}>
        {/* y axis */}
        <div className="flex w-12 shrink-0 flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-muted" aria-hidden>
          {ticks.map((t) => <span key={t}>{axis(t)}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          {/* grid */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden>
            {ticks.map((t) => <span key={t} className={t === 0 ? "h-px bg-line" : "h-px bg-chart-grid"} />)}
          </div>
          {/* bars */}
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[2px]" role="list" aria-label={caption}
            onMouseLeave={() => setActive(null)}>
            {data.map((d, i) => (
              <button key={d.key} type="button" role="listitem" aria-describedby={active === i ? `${id}-tip` : undefined}
                aria-label={`${d.label}: ${format(d.value)}${d.detail ? `, ${d.detail}` : ""}`}
                onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                className="group relative flex h-full min-w-0 flex-1 items-end outline-none">
                <span className={`block w-full rounded-t-[4px] transition-opacity ${active == null || active === i ? "opacity-100" : "opacity-45"} bg-chart-1 group-focus-visible:ring-2 group-focus-visible:ring-ink`}
                  style={{ height: d.value > 0 ? `max(2px, ${(d.value / max) * 100}%)` : 0 }} />
              </button>
            ))}
          </div>
          {/* x labels */}
          <div className="absolute inset-x-0 bottom-0 flex h-5 gap-[2px] text-[11px] text-muted" aria-hidden>
            {data.map((d, i) => <span key={d.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">{i % every === 0 ? d.label : ""}</span>)}
          </div>
          {/* tooltip */}
          {a && (
            <div id={`${id}-tip`} role="tooltip"
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs shadow-lg"
              style={{ left: `${((active! + 0.5) / data.length) * 100}%` }}>
              <p className="font-semibold text-graphite">{a.label}</p>
              <p className="tabular-nums text-graphite">{format(a.value)}</p>
              {a.detail && <p className="text-muted">{a.detail}</p>}
            </div>
          )}
        </div>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="mt-2 w-full">
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-line"><td className="py-1">{d.label}</td><td className="py-1 text-right tabular-nums">{format(d.value)}</td>{d.detail !== undefined && <td className="py-1 pl-3 text-right text-muted">{d.detail}</td>}</tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
