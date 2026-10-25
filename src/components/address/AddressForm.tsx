"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LocateFixed, X, UserRound, Users, Search, MapPin, ChevronLeft, Loader2 } from "lucide-react";
import clsx from "clsx";
import { saveAddress, type SavedAddress } from "@/app/actions/addresses";
import { useLocation } from "@/components/providers/LocationProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { haversineKm } from "@/lib/format";

const MapPicker = dynamic(() => import("@/components/location/MapPicker"), { ssr: false, loading: () => <div className="skeleton h-full min-h-[240px] rounded-2xl" /> });

const LABELS = ["Home", "Work", "School", "Other"];

type Hit = { name: string; lat: number; lng: number };
/** Place search, kept to the Kohima area so results are relevant. */
async function searchPlaces(q: string, near: { lat: number; lng: number }): Promise<Hit[]> {
  try {
    const box = [near.lng - 0.25, near.lat + 0.25, near.lng + 0.25, near.lat - 0.25].join(",");
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=in&viewbox=${box}&bounded=1&q=${encodeURIComponent(q)}`, { headers: { "Accept-Language": "en" } });
    const list = (await r.json()) as { display_name: string; lat: string; lon: string }[];
    return list.map((x) => ({ name: x.display_name.split(", ").slice(0, 3).join(", "), lat: Number(x.lat), lng: Number(x.lon) }));
  } catch {
    return [];
  }
}

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
  // Step 1: drop the pin on the map (required). Step 2: house number, landmark, contact.
  const [step, setStep] = useState<"pin" | "details">("pin");
  const [touched, setTouched] = useState(false);
  const [area, setArea] = useState("");
  const [looking, setLooking] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoTicket = useRef(0);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    setErr(null); setQ(""); setHits([]);
    if (initial) {
      setStep("details"); setTouched(true); setArea(initial.road);
      setPin({ lat: initial.lat, lng: initial.lng });
      setF({ label: initial.label, house_name: initial.house_name, road: initial.road, landmark: initial.landmark ?? "", contact_name: initial.contact_name,
        contact_phone: initial.contact_phone, for_someone_else: initial.for_someone_else, is_default: initial.is_default });
    } else {
      setStep("pin"); setTouched(false); setArea("");
      setPin(location ? { lat: location.lat, lng: location.lng } : { lat: store.lat, lng: store.lng });
      setF((s) => ({ ...s, label: "Home", house_name: "", road: "", landmark: "", for_someone_else: false,
        contact_name: profile?.name ?? "", contact_phone: profile?.phone ?? "" }));
    }
  }, [open, initial, location, store, profile]);

  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  // Map moves report the centre; ignore the tiny jitter of the first render
  const movePin = async (lat: number, lng: number, user = true) => {
    setPin((p) => (Math.abs(p.lat - lat) < 1e-7 && Math.abs(p.lng - lng) < 1e-7 ? p : { lat, lng }));
    if (user) setTouched(true);
    setLooking(true);
    // Wait for the map to settle before asking for the address (OpenStreetMap asks for ≤1 lookup a second)
    if (geoTimer.current) clearTimeout(geoTimer.current);
    const ticket = ++geoTicket.current;
    geoTimer.current = setTimeout(async () => {
      const r = await reverse(lat, lng);
      if (ticket !== geoTicket.current) return;
      setLooking(false);
      setArea(r);
    }, 700);
  };

  useEffect(() => {
    if (q.trim().length < 3) { setHits([]); return; }
    const t = setTimeout(async () => setHits(await searchPlaces(q.trim(), store)), 450);
    return () => clearTimeout(t);
  }, [q, store]);

  const confirmPin = () => {
    // Fill the road from the pin unless the shopper already typed one
    setF((s) => ({ ...s, road: s.road && initial ? s.road : area || s.road }));
    setErr(null);
    setStep("details");
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
        className={clsx("mt-1 h-11 w-full rounded-xl border bg-paper px-3 text-[16px] outline-none sm:text-sm focus:border-ink", err?.field === k ? "border-margin" : "border-line")} />
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
              <div className="flex items-center gap-1">
                {step === "details" && (
                  <button type="button" onClick={() => setStep("pin")} className="-ml-2 grid size-9 place-items-center rounded-full hover:bg-paper" aria-label="Back to map"><ChevronLeft className="size-5" /></button>
                )}
                <div>
                  <h2 id="addr-title" className="text-lg font-bold">{step === "pin" ? "Pin your delivery spot" : initial ? "Edit address" : "Address details"}</h2>
                  <p className="text-xs text-muted">Step {step === "pin" ? 1 : 2} of 2</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-paper" aria-label="Close"><X className="size-5" /></button>
            </div>
            {step === "pin" ? (
              <>
                <div className="relative flex-1 space-y-3 overflow-y-auto px-4 py-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (hits[0]) { setQ(""); setHits([]); void movePin(hits[0].lat, hits[0].lng); } } }} enterKeyHint="search" placeholder="Search area, street or landmark" aria-label="Search for a place"
                      className="h-11 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-[16px] outline-none focus:border-ink sm:text-sm" />
                    {hits.length > 0 && (
                      <ul className="absolute inset-x-0 top-full z-[600] mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-card p-1 shadow-lg">
                        {hits.map((h) => (
                          <li key={`${h.lat},${h.lng}`}>
                            <button type="button" onClick={() => { setQ(""); setHits([]); void movePin(h.lat, h.lng); }}
                              className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-soft">
                              <MapPin className="mt-0.5 size-4 shrink-0 text-ink" /> {h.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="relative">
                    <MapPicker mode="center" value={pin} onChange={(la, ln) => void movePin(la, ln)} store={store} radiusKm={store.radiusKm} height="min(52dvh, 420px)" />
                    <button type="button" onClick={useGps} disabled={locating}
                      className="absolute bottom-3 right-3 z-[550] inline-flex h-10 items-center gap-1.5 rounded-full bg-card px-3.5 text-sm font-semibold text-ink shadow-md disabled:opacity-70">
                      {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />} {locating ? "Finding you…" : "Current location"}
                    </button>
                  </div>
                  <p className="text-xs text-muted">Move the map so the pin sits exactly on your door. Pinch to zoom in.</p>
                  {err && <p className="rounded-xl bg-margin/10 px-3 py-2 text-sm font-semibold text-margin" role="alert">{err.text}</p>}
                </div>
                <div className="space-y-3 border-t border-line p-4">
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-ink" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{looking ? "Finding the address…" : area || (touched ? "Pinned location" : "Move the map to your spot")}</p>
                      <p className={`text-xs ${km <= store.radiusKm ? "text-muted" : "font-semibold text-margin"}`}>
                        {km <= store.radiusKm ? `About ${km.toFixed(1)} km from the store` : `About ${km.toFixed(1)} km away, likely outside our ${store.radiusKm} km delivery area`}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={confirmPin} disabled={!touched && !location}
                    className="h-12 w-full rounded-xl bg-ink font-semibold text-white disabled:opacity-50">
                    {!touched && !location ? "Move the map or use current location" : "Confirm location"}
                  </button>
                </div>
              </>
            ) : (
            <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <button type="button" onClick={() => setStep("pin")} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-paper p-3 text-left text-sm">
                <MapPin className="size-5 shrink-0 text-ink" />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{area || "Pinned location"}</span><span className="text-xs text-muted">{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)} · {km.toFixed(1)} km from the store</span></span>
                <span className="shrink-0 font-semibold text-ink">Change</span>
              </button>

              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who is this for">
                {[{ on: false, label: "For me", icon: UserRound }, { on: true, label: "For someone else", icon: Users }].map(({ on, label, icon: Icon }) => (
                  <button key={label} type="button" role="radio" aria-checked={f.for_someone_else === on} onClick={() => toggleSomeoneElse(on)}
                    className={clsx("flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] text-sm font-semibold", f.for_someone_else === on ? "border-ink bg-ink-soft text-ink" : "border-line")}>
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>

              {input("house_name", "House no. / building, floor", { autoComplete: "address-line1", placeholder: "e.g. H.No 12, Lhou House, 2nd floor" })}
              {input("road", "Road and area", { autoComplete: "address-line2", placeholder: "e.g. PR Hill Road, Kohima" })}
              {input("landmark", "Landmark (optional)", { placeholder: "e.g. near Baptist church" })}
              <div className="grid gap-3 sm:grid-cols-2">
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
            </>
            )}
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
