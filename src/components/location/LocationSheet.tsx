"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LocateFixed, MapPin, X } from "lucide-react";
import { useLocation } from "@/components/providers/LocationProvider";
import { haversineKm } from "@/lib/format";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false, loading: () => <div className="skeleton h-[300px] rounded-[12px]" /> });

export function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { location, status, locate, setLocation, store } = useLocation();
  const [mode, setMode] = useState<"ask" | "map">("ask");
  const [pick, setPick] = useState({ lat: store.lat, lng: store.lng });

  useEffect(() => {
    if (open) { setMode("ask"); if (location) setPick({ lat: location.lat, lng: location.lng }); }
  }, [open, location]);

  useEffect(() => {
    if (status === "in_range" || status === "out_of_range") {
      if (location?.source === "gps" && open) onClose();
    }
  }, [status, location, open, onClose]);

  const km = haversineKm(pick, store);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Portal to <body> so the sticky, blurred header can't clip this overlay
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[55] flex items-end justify-center bg-scrim sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="loc-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-7 sm:rounded-[16px]"
          >
            <div className="flex items-start justify-between">
              <h2 id="loc-title" className="text-xl font-bold">{mode === "map" ? "Drop a pin on the door" : "Where should we deliver?"}</h2>
              <button onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-paper" aria-label="Close"><X className="size-5" /></button>
            </div>

            {mode === "ask" ? (
              <>
                <p className="mt-1 text-sm text-muted">
                  We deliver within {store.radiusKm} km of our Khedi Market store, Kohima. Your location helps us show delivery times and check you&apos;re in range.
                </p>
                <button
                  onClick={locate}
                  disabled={status === "locating"}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-ink font-semibold text-on-ink disabled:opacity-70"
                >
                  <LocateFixed className="size-5" />
                  {status === "locating" ? "Finding you…" : "Use my current location"}
                </button>
                {status === "denied" && (
                  <p className="mt-2 text-sm text-margin">Location access is off. Allow it in your browser settings, or pick on the map.</p>
                )}
                <button onClick={() => setMode("map")} className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-line font-semibold">
                  <MapPin className="size-5 text-ink" /> Pick on the map
                </button>
                <button onClick={onClose} className="mt-3 w-full text-center text-sm font-semibold text-muted underline-offset-4 hover:underline">
                  Browse first, decide later
                </button>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Tap the map or drag the pin to your exact building.</p>
                <div className="mt-3">
                  <MapPicker value={pick} onChange={(lat, lng) => setPick({ lat, lng })} store={store} radiusKm={store.radiusKm} />
                </div>
                <p className={`mt-2 text-sm ${km <= store.radiusKm ? "text-ok" : "text-margin"}`}>
                  {km <= store.radiusKm
                    ? `About ${km.toFixed(1)} km from the store`
                    : `About ${km.toFixed(1)} km away, outside delivery range. Store pickup is still available.`}
                </p>
                <button
                  onClick={() => { setLocation({ ...pick, label: "Pinned location", source: "map" }); onClose(); }}
                  className="mt-3 h-12 w-full rounded-[10px] bg-ink font-semibold text-on-ink"
                >
                  Use this location
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
