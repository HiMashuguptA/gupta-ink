import { Clock } from "lucide-react";

/** Tells customers what's possible right now, based on store hours. */
export function StoreNotice({ quickOpen, storeOpen, paused }: { quickOpen: boolean; storeOpen: boolean; paused: boolean }) {
  if (quickOpen && !paused) return null;
  const text = paused
    ? "We're not taking orders right now. Please check back soon."
    : storeOpen
      ? "Quick delivery runs 11:00 to 15:00. You can still schedule a delivery or pick up from the store today."
      : "We're closed right now. Schedule a delivery slot or a store pickup, and we'll have it ready.";
  return (
    <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl border border-nib/40 bg-nib-soft px-3.5 py-3 text-sm">
      <Clock className="mt-0.5 size-4 shrink-0 text-nib" />
      <p>{text}</p>
    </div>
  );
}
