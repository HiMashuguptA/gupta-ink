export function TileSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-2.5" aria-hidden>
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
