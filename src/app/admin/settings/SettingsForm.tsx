"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, Trash2, PauseCircle, PlayCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { refreshCatalog } from "@/app/actions/admin";

export type Settings = {
  store_phone: string; support_email: string; store_upi_id: string; delivery_radius_km: number;
  min_order_paise: number; delivery_fee_paise: number; free_delivery_min_paise: number; quick_eta_min: number; quick_eta_max: number;
  store_open: string; store_close: string; delivery_start: string; delivery_end: string; quick_last_order: string;
  slot_windows: { start: string; end: string }[]; slot_capacity: number; slot_days_ahead: number;
  coin_rate_bp: number; coin_expiry_days: number; referral_reward_coins: number; free_cancels_per_week: number; cancel_fine_paise: number;
  return_window_days: number; pickup_hold_hours: number; upi_daily_cap: number; cod_limit_paise: number; orders_paused: boolean; holidays: string[];
};

type Num = { key: keyof Settings; label: string; unit: "rupees" | "number" | "percent"; min?: number; max?: number; hint?: string };
const GROUPS: { title: string; fields: Num[] }[] = [
  { title: "Money", fields: [
    { key: "min_order_paise", label: "Minimum order", unit: "rupees", min: 0 },
    { key: "delivery_fee_paise", label: "Delivery fee", unit: "rupees", min: 0 },
    { key: "free_delivery_min_paise", label: "Free delivery from", unit: "rupees", min: 0, hint: "After coupon" },
    { key: "cod_limit_paise", label: "Cash on delivery up to", unit: "rupees", min: 0 },
    { key: "upi_daily_cap", label: "UPI orders per day", unit: "number", min: 0 },
  ] },
  { title: "Delivery", fields: [
    { key: "delivery_radius_km", label: "Delivery distance (km by road)", unit: "number", min: 1, max: 50 },
    { key: "quick_eta_min", label: "Quick delivery from (min)", unit: "number", min: 10 },
    { key: "quick_eta_max", label: "Quick delivery up to (min)", unit: "number", min: 10 },
    { key: "slot_capacity", label: "Orders per slot", unit: "number", min: 1 },
    { key: "slot_days_ahead", label: "Days ahead to book", unit: "number", min: 1, max: 14 },
    { key: "pickup_hold_hours", label: "Hold pickups for (hours)", unit: "number", min: 1 },
  ] },
  { title: "Coins, cancellations, returns", fields: [
    { key: "coin_rate_bp", label: "SuperCoins earned", unit: "percent", min: 0, max: 20 },
    { key: "coin_expiry_days", label: "Coins last (days)", unit: "number", min: 1 },
    { key: "referral_reward_coins", label: "Referral reward (coins each)", unit: "number", min: 0 },
    { key: "free_cancels_per_week", label: "Free cancellations per week", unit: "number", min: 0 },
    { key: "cancel_fine_paise", label: "Fine after that", unit: "rupees", min: 0 },
    { key: "return_window_days", label: "Return window (days)", unit: "number", min: 0, max: 30 },
  ] },
];
const TIMES: { key: keyof Settings; label: string }[] = [
  { key: "store_open", label: "Store opens" }, { key: "store_close", label: "Store closes" },
  { key: "delivery_start", label: "Deliveries start" }, { key: "delivery_end", label: "Deliveries end" },
  { key: "quick_last_order", label: "Last quick order" },
];

const show = (s: Settings, f: Num) => { const v = Number(s[f.key]); return String(f.unit === "rupees" ? v / 100 : f.unit === "percent" ? v / 100 : v); };
const store = (f: Num, raw: string) => { const v = Number(raw) || 0; return f.unit === "rupees" || f.unit === "percent" ? Math.round(v * 100) : v; };

export function SettingsForm({ initial }: { initial: Settings }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [nums, setNums] = useState<Record<string, string>>(() => Object.fromEntries(GROUPS.flatMap((g) => g.fields).map((f) => [f.key, show(initial, f)])));
  const [holiday, setHoliday] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const field = "mt-1 h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:border-ink";
  const hhmm = (t: string) => t.slice(0, 5);

  const save = async (override?: Partial<Settings>) => {
    setMsg(null);
    const change: Record<string, unknown> = { ...override };
    if (!override) {
      for (const f of GROUPS.flatMap((g) => g.fields)) {
        const v = store(f, nums[f.key]);
        if (f.min != null && v < (f.unit === "number" ? f.min : f.min * 100)) return setMsg({ ok: false, text: `${f.label} is too low` });
        if (f.max != null && v > (f.unit === "number" ? f.max : f.max * 100)) return setMsg({ ok: false, text: `${f.label} is too high` });
        change[f.key] = v;
      }
      if (Number(nums.quick_eta_min) > Number(nums.quick_eta_max)) return setMsg({ ok: false, text: "Quick delivery 'from' must be under 'up to'" });
      if (!/^[\w.-]{2,64}@[a-zA-Z]{2,64}$/.test(s.store_upi_id)) return setMsg({ ok: false, text: "Store UPI ID doesn't look right" });
      if (!/^\d{10}$/.test(s.store_phone)) return setMsg({ ok: false, text: "Store phone must be 10 digits" });
      if (s.slot_windows.some((w) => w.start >= w.end)) return setMsg({ ok: false, text: "Each slot must end after it starts" });
      Object.assign(change, { store_phone: s.store_phone, support_email: s.support_email.trim(), store_upi_id: s.store_upi_id.trim(),
        store_open: s.store_open, store_close: s.store_close, delivery_start: s.delivery_start, delivery_end: s.delivery_end,
        quick_last_order: s.quick_last_order, slot_windows: s.slot_windows, holidays: s.holidays });
    }
    setBusy(true);
    const { error } = await sb.from("settings").update({ ...change, updated_at: new Date().toISOString() }).eq("id", 1);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    if (override) setS((x) => ({ ...x, ...override }));
    await refreshCatalog();
    setMsg({ ok: true, text: "Saved." });
    router.refresh();
  };

  return (
    <div className="mt-5 space-y-5 pb-24 text-sm">
      <section className={clsx("flex items-center gap-3 rounded-2xl border-[1.5px] p-4", s.orders_paused ? "border-margin bg-margin/5" : "border-line bg-card")}>
        {s.orders_paused ? <PauseCircle className="size-7 text-margin" /> : <PlayCircle className="size-7 text-ok" />}
        <div className="flex-1"><p className="font-bold">{s.orders_paused ? "Orders are paused" : "Taking orders"}</p><p className="text-muted">Pause for stock-taking or emergencies. Customers can still browse.</p></div>
        <button disabled={busy} onClick={() => save({ orders_paused: !s.orders_paused })}
          className={clsx("h-10 rounded-xl px-4 font-semibold text-white disabled:opacity-50", s.orders_paused ? "bg-ok" : "bg-margin")}>{s.orders_paused ? "Resume orders" : "Pause orders"}</button>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-bold">Contact and payments</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="font-semibold">Store phone<input value={s.store_phone} onChange={(e) => setS({ ...s, store_phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} className={field} inputMode="tel" /></label>
          <label className="font-semibold">Support email<input value={s.support_email} onChange={(e) => setS({ ...s, support_email: e.target.value })} className={field} type="email" /></label>
          <label className="font-semibold">Store UPI ID<input value={s.store_upi_id} onChange={(e) => setS({ ...s, store_upi_id: e.target.value })} className={field} /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-bold">Hours (India time)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {TIMES.map((t) => <label key={t.key} className="font-semibold">{t.label}<input type="time" value={hhmm(String(s[t.key]))} onChange={(e) => setS({ ...s, [t.key]: e.target.value })} className={field} /></label>)}
        </div>
        <p className="mt-4 font-semibold">Delivery slots</p>
        <ul className="mt-1 space-y-2">
          {s.slot_windows.map((w, i) => (
            <li key={i} className="flex items-center gap-2">
              <input type="time" value={w.start} onChange={(e) => setS({ ...s, slot_windows: s.slot_windows.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)) })} className="h-10 rounded-lg border border-line bg-paper px-2" aria-label={`Slot ${i + 1} start`} />
              <span className="text-muted">to</span>
              <input type="time" value={w.end} onChange={(e) => setS({ ...s, slot_windows: s.slot_windows.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)) })} className="h-10 rounded-lg border border-line bg-paper px-2" aria-label={`Slot ${i + 1} end`} />
              <button type="button" onClick={() => setS({ ...s, slot_windows: s.slot_windows.filter((_, k) => k !== i) })} disabled={s.slot_windows.length === 1} className="grid size-9 place-items-center rounded-full text-margin hover:bg-margin/10 disabled:opacity-30" aria-label="Remove slot"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setS({ ...s, slot_windows: [...s.slot_windows, { start: "16:00", end: "17:00" }] })} className="mt-2 inline-flex items-center gap-1 font-semibold text-ink"><Plus className="size-4" /> Add slot</button>

        <p className="mt-4 font-semibold">Holidays (closed all day)</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {s.holidays.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1">
              {new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}
              <button type="button" onClick={() => setS({ ...s, holidays: s.holidays.filter((x) => x !== d) })} aria-label={`Remove ${d}`} className="text-margin">×</button>
            </span>
          ))}
          <input type="date" value={holiday} onChange={(e) => setHoliday(e.target.value)} className="h-9 rounded-lg border border-line bg-paper px-2" aria-label="Add holiday" />
          <button type="button" disabled={!holiday} onClick={() => { setS({ ...s, holidays: [...new Set([...s.holidays, holiday])].sort() }); setHoliday(""); }} className="h-9 rounded-full border border-ink px-3 font-semibold text-ink disabled:opacity-40">Add</button>
        </div>
      </section>

      {GROUPS.map((g) => (
        <section key={g.title} className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-bold">{g.title}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {g.fields.map((f) => (
              <label key={f.key} className="font-semibold">{f.label}{f.unit === "rupees" ? " (₹)" : f.unit === "percent" ? " (%)" : ""}
                <input inputMode="decimal" value={nums[f.key]} onChange={(e) => setNums({ ...nums, [f.key]: e.target.value.replace(/[^\d.]/g, "") })} className={field} />
                {f.hint && <span className="text-xs font-normal text-muted">{f.hint}</span>}
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 p-3 backdrop-blur md:left-[220px]">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {msg && <p className={clsx("min-w-0 flex-1 font-semibold", msg.ok ? "text-ok" : "text-margin")} role="status">{msg.text}</p>}
          <button onClick={() => save()} disabled={busy} className="ml-auto h-11 rounded-xl bg-ink px-6 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save settings"}</button>
        </div>
      </div>
    </div>
  );
}
