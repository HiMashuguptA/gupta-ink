import { ShelfLoader } from "@/components/shop/Skeletons";

export default function Loading() {
  return (
    <div className="px-4 pt-6" aria-busy aria-label="Loading">
      <ShelfLoader />
      <div className="skeleton h-6 w-40" />
      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => <div key={i} className="skeleton aspect-square rounded-[12px]" />)}
      </div>
    </div>
  );
}
