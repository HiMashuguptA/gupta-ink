"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LocateFixed, X, UserRound, Users } from "lucide-react";
import clsx from "clsx";
import { saveAddress, type SavedAddress } from "@/app/actions/addresses";
import { useLocation } from "@/components/providers/LocationProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { haversineKm } from "@/lib/format";

const MapPicker = dynamic(() => import("@/components/location/MapPicker"), { ssr: false, loading: () => <div className="skeleton h-[240px] rounded-2xl" /> });

const LABELS = ["Home", "Work", "School", "Other"];

async function reverse(lat: number, lng: number) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "en" } });
    const a = (await r.json()).address ?? {};
    return [a.road, a.neighbourhood || a.suburb || a.quarter, a.city || a.town || a.village].filter(Boolean).join(", ");
  } catch {
    return "";
  }
}

export function AddressForm({
  open, onClose, onSaved, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (a: SavedAddress, info: { inRange: boolean; approx: boolean; radiusKm: number }) => void;
  initial?: SavedAddress | null;
}) {
  const { store, location } = useLocation();
  const { profile } = useSession();
  const [mounted, setMounted] = useState(false);
  const [pin, setPin] = useState({ lat: store.lat, lng: store.lng });
  const [f, setF] = useState({ label: "Home", house_name: "", road: "", landmark: "", contact_name: "", contact_phone: "", for_someone_else: false, is_default: false });
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (initial) {
      setPin({ lat: initial.lat, lng: initial.lng });
      setF({ label: initial.label, house_name: initial.house_name, road: initial.road, landmark: initial.landmark ?? "", contact_name: initial.contact_name,
        contact_phone: initial.contact_phone, for_someone_else: initial.for_someone_else, is_default: initial.is_default });
    } else {
      setPin(location ? { lat: location.lat, lng: location.lng } : { lat: store.lat, lng: store.lng });
      setF((s) => ({ ...s, label: "Home", house_name: "", road: "", landmark: "", for_someone_else: false,
        contact_name: profile?.name ?? "", contact_phone: profile?.phone ?? "" }));
    }
  }, [open, initial, location, store, profile]);

  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  const movePin = async (lat: number, lng: number) => {
    setPin({ lat, lng });
    if (!f.road) { const r = await reverse(lat, lng); if (r) setF((s) => (s.road ? s : { ...s, road: r })); }
  };

  const useGps = () => {
    if (!("geolocation" in navigator)) return setErr({ text: "This browser can't share location. Drag the pin instead." });
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => { setLocating(false); await movePin(p.coords.latitude, p.coords.longitude); },
      () => { setLocating(false); setErr({ text: "Location access is off. Allow it in your browser, or drag the pin." }); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const toggleSomeoneElse = (on: boolean) => {
    setF((s) => ({ ...s, for_someone_else: on, contact_name: on ? "" : profile?.name ?? "", contact_phone: on ? "" : profile?.phone ?? "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await saveAddress({ ...f, id: initial?.id, lat: pin.lat, lng: pin.lng, landmark: f.landmark || null });
    setBusy(false);
    if (!res.ok) return setErr({ text: res.error, field: res.field });
    onSaved(res.address, res);
  };

  const km = haversineKm(pin, store);
  const input = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`addr-${k}`} className="text-sm font-semibold">{label}</label>
      <input id={`addr-${k}`} value={f[k] as string} onChange={(e) => set(k, k === "contact_phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)}
        aria-invalid={err?.field === k} {...props}
        className={clsx("mt-1 h-11 w-full rounded-xl border bg-paper px-3 outline-none focus:border-ink", err?.field === k ? "border-margin" : "border-line")} />
    </div>
  );

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-deep/40 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.form
            onSubmit={submit} onClick={(e) => e.stopPropagation()} noValidate
            role="dialog" aria-modal="true" aria-labelledby="addr-title"
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-card sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="addr-title" className="text-lg font-bold">{initial ? "Edit address" : "Add delivery address"}</h2>
              <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-paper" aria-label="Close"><X className="size-5" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Pin your exact door</p>
                  <button type="button" onClick={useGps} disabled={locating} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink disabled:opacity-60">
                    <LocateFixed className="size-4" /> {locating ? "Finding you…" : "Use current location"}
                  </button>
                </div>
                <MapPicker value={pin} onChange={(la, ln) => void movePin(la, ln)} store={store} radiusKm={store.radiusKm} height={240} />
                <p className={`mt-1.5 text-xs ${km <= store.radiusKm ? "text-muted" : "text-margin"}`}>
                  {km <= store.radiusKm ? `About ${km.toFixed(1)} km from the store in a straight line. We check the road distance when you save.` : `About ${km.toFixed(1)} km away, which is likely outside our ${store.radiusKm} km delivery area.`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who is this for">
                {[{ on: false, label: "For me", icon: UserRound }, { on: true, label: "For someone else", icon: Users }].map(({ on, label, icon: Icon }) => (
                  <button key={label} type="button" role="radio" aria-checked={f.for_someone_else === on} onClick={() => toggleSomeoneElse(on)}
                    className={clsx("flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] text-sm font-semibold", f.for_someone_else === on ? "border-ink bg-ink-soft text-ink" : "border-line")}>
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>

              {input("house_name", "House or building name", { autoComplete: "address-line1", placeholder: "e.g. Lhou House, 2nd floor" })}
              {input("road", "Road and area", { autoComplete: "address-line2", placeholder: "e.g. PR Hill Road, Kohima" })}
              {input("landmark", "Landmark (optional)", { placeholder: "e.g. near Baptist church" })}
              <div className="grid grid-cols-2 gap-3">
                {input("contact_name", f.for_someone_else ? "Their name" : "Your name", { autoComplete: f.for_someone_else ? "off" : "name" })}
                {input("contact_phone", f.for_someone_else ? "Their mobile" : "Mobile number", { inputMode: "numeric", autoComplete: f.for_someone_else ? "off" : "tel-national" })}
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Save as</legend>
                <div className="flex flex-wrap gap-2">
                  {LABELS.map((l) => (
                    <button key={l} type="button" onClick={() => set("label", l)} aria-pressed={f.label === l}
                      className={clsx("h-9 rounded-full border px-3.5 text-sm font-semibold", f.label === l ? "border-ink bg-ink text-white" : "border-line")}>{l}</button>
                  ))}
                </div>
              </fieldset>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.is_default} onChange={(e) => set("is_default", e.target.checked)} className="size-4 accent-[var(--ink)]" />
                Make this my default address
              </label>
              {err && <p className="rounded-xl bg-margin/10 px-3 py-2 text-sm font-semibold text-margin" role="alert">{err.text}</p>}
            </div>
            <div className="border-t border-line p-4">
              <button disabled={busy} className="h-12 w-full rounded-xl bg-ink font-semibold text-white disabled:opacity-60">
                {busy ? "Checking road distance…" : "Save address"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
