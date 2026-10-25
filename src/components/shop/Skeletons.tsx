export function TileSkeleton() {
  return (
    <div className="rounded-[12px] bg-card p-2.5" aria-hidden>
      <div className="skeleton aspect-square" />
      <div className="skeleton mt-2 h-3.5 w-11/12" />
      <div className="skeleton mt-1.5 h-3.5 w-2/3" />
      <div className="mt-4 flex items-end justify-between">
        <div className="skeleton h-5 w-12" />
        <div className="skeleton h-9 w-[76px]" />
      </div>
    </div>
  );
}

export function RailSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="mt-7" aria-hidden>
      {title && <div className="skeleton mx-4 mb-3 h-5 w-40" />}
      <div className="flex gap-3 overflow-hidden px-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="w-[156px] shrink-0"><TileSkeleton /></div>
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-busy>
      {Array.from({ length: n }, (_, i) => <TileSkeleton key={i} />)}
    </div>
  );
}

export function ListSkeleton({ rows = 5, title = true, label }: { rows?: number; title?: boolean; label?: string }) {
  return (
    <div className="px-4 pt-2" aria-busy aria-label="Loading">
      <ShelfLoader label={label} />
      {title && <div className="skeleton h-8 w-48" />}
      <div className="mt-4 divide-y divide-line rounded-[12px] bg-card">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="skeleton size-12 shrink-0 rounded-[10px]" />
            <div className="flex-1"><div className="skeleton h-3.5 w-2/3" /><div className="skeleton mt-2 h-3 w-1/3" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageGridSkeleton() {
  return (
    <div className="px-4 pt-2" aria-busy aria-label="Loading">
      <ShelfLoader />
      <div className="skeleton h-8 w-48" />
      <div className="mt-4 flex gap-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-9 w-24 rounded-full" />)}</div>
      <div className="mt-5"><GridSkeleton /></div>
    </div>
  );
}

export function TextSkeleton() {
  return (
    <div className="max-w-[68ch] px-4 pt-6" aria-busy aria-label="Loading">
      <div className="skeleton h-9 w-56" />
      <div className="skeleton mt-3 h-4 w-full" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="mt-7"><div className="skeleton h-5 w-40" /><div className="skeleton mt-3 h-3.5 w-full" /><div className="skeleton mt-2 h-3.5 w-11/12" /><div className="skeleton mt-2 h-3.5 w-4/5" /></div>
      ))}
    </div>
  );
}

/** A little shelf of stationery hopping in turn while a page is fetched. */
export function ShelfLoader({ label = "Fetching from the shelves" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-3" role="status" aria-live="polite">
      <span className="flex items-end gap-1.5" aria-hidden>
        <svg className="shelf-hop" style={{ animationDelay: "0ms" }} width="10" height="26" viewBox="0 0 10 26"><path d="M1 6h8v18H1z" fill="var(--nib)" /><path d="M1 6l4-5 4 5z" fill="#f3d9b1" /><path d="M3.6 2.6 5 1l1.4 1.6z" fill="var(--graphite)" /><rect x="1" y="22" width="8" height="3" fill="var(--margin)" /></svg>
        <svg className="shelf-hop" style={{ animationDelay: "120ms" }} width="20" height="24" viewBox="0 0 20 24"><rect x="1" y="1" width="18" height="22" rx="2.5" fill="var(--ink)" /><rect x="5" y="6" width="10" height="3" rx="1" fill="var(--nib)" /><path d="M4 1v22" stroke="rgb(0 0 0 / .25)" strokeWidth="1.5" /></svg>
        <svg className="shelf-hop" style={{ animationDelay: "240ms" }} width="16" height="12" viewBox="0 0 16 12"><rect x="1" y="1" width="14" height="10" rx="2" fill="var(--margin)" /><rect x="1" y="1" width="6" height="10" rx="2" fill="#fff" opacity=".85" /></svg>
      </span>
      <span className="text-sm font-semibold text-muted">{label}<span className="shelf-dots" /></span>
    </div>
  );
}
