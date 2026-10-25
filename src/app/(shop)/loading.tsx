import { RailSkeleton } from "@/components/shop/Skeletons";

export default function Loading() {
  return (
    <div aria-busy aria-label="Loading">
      <div className="px-4 pt-4"><div className="skeleton aspect-[2.1/1] w-full rounded-[16px] sm:aspect-[3.2/1]" /></div>
      <RailSkeleton />
      <div className="mt-7 grid grid-cols-4 gap-3 px-4 sm:grid-cols-5">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton aspect-square rounded-[12px]" />)}
      </div>
      <RailSkeleton />
    </div>
  );
}
