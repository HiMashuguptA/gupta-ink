/** Ranked horizontal bars with the value written beside each (no hover needed). */
export function BarList({ rows, format, sub, empty = "No data in this period." }: {
  rows: { name: string; value: number; note?: string }[]; format: (v: number) => string; sub?: (r: { name: string; value: number; note?: string }) => string | undefined; empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-4 text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.name} title={`${r.name}: ${format(r.value)}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold">{r.name}</span>
            <span className="shrink-0 tabular-nums">{format(r.value)}{sub?.(r) ? <span className="ml-1.5 text-xs text-muted">{sub(r)}</span> : null}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-chart-grid" aria-hidden>
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
