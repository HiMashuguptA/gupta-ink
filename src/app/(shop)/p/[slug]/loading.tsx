import { ShelfLoader } from "@/components/shop/Skeletons";

export default function Loading() {
  return (
    <div aria-busy>
    <ShelfLoader label="Taking it off the shelf" />
    <div className="grid gap-6 px-4 md:grid-cols-2">
      <div className="skeleton aspect-square rounded-[16px]" />
      <div>
        <div className="skeleton h-4 w-24" />
        <div className="skeleton mt-3 h-8 w-4/5" />
        <div className="skeleton mt-5 h-9 w-40" />
        <div className="mt-6 flex gap-2"><div className="skeleton h-10 w-24" /><div className="skeleton h-10 w-24" /></div>
        <div className="skeleton mt-6 h-12 w-full max-w-sm" />
        <div className="skeleton mt-6 h-36 w-full rounded-[12px]" />
      </div>
    </div>
    </div>
  );
}
