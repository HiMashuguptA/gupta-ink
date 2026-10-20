import { GridSkeleton } from "@/components/shop/Skeletons";

export default function Loading() {
  return (
    <div className="px-4 pt-4" aria-busy>
      <div className="skeleton h-8 w-48" />
      <div className="mt-4 flex gap-2">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-9 w-24 rounded-full" />)}</div>
      <div className="mt-5"><GridSkeleton /></div>
    </div>
  );
}
