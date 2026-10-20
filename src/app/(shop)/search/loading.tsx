import { GridSkeleton } from "@/components/shop/Skeletons";

export default function Loading() {
  return (
    <div className="px-4 pt-4" aria-busy>
      <div className="skeleton h-7 w-56" />
      <div className="mt-5"><GridSkeleton /></div>
    </div>
  );
}
