import type { StoreSettings } from "./types";

/** Current time in Kohima (IST) as minutes since midnight, plus the date string. */
export function istNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { minutes: Number(get("hour")) * 60 + Number(get("minute")), date: `${get("year")}-${get("month")}-${get("day")}` };
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export function storeStatus(s: StoreSettings | null) {
  if (!s) return { quickOpen: false, storeOpen: false, eta: "45-60 min" };
  const { minutes } = istNow();
  const quickOpen = !s.orders_paused && minutes >= toMin(s.delivery_start) && minutes <= toMin(s.quick_last_order);
  const storeOpen = !s.orders_paused && minutes >= toMin(s.store_open) && minutes <= toMin(s.store_close);
  return { quickOpen, storeOpen, eta: `${s.quick_eta_min}-${s.quick_eta_max} min` };
}

export type StoreHours = Pick<StoreSettings, "store_open" | "store_close" | "delivery_start" | "quick_last_order" | "orders_paused" | "quick_eta_min" | "quick_eta_max">;

const fmt12 = (t: string) => {
  const m = toMin(t);
  const h = Math.floor(m / 60), mm = m % 60;
  return `${((h + 11) % 12) + 1}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
};

/** What the shop sign says right now: open for quick delivery, open for slots and pickup, or closed. */
export function signState(h: StoreHours | null, d = new Date()) {
  if (!h) return { open: false, title: "Closed", line: "", detail: "" };
  const { minutes } = istNow(d);
  if (h.orders_paused) return { open: false, title: "Closed", line: "Orders paused", detail: "The store has paused new orders for now." };
  const quick = minutes >= toMin(h.delivery_start) && minutes <= toMin(h.quick_last_order);
  const store = minutes >= toMin(h.store_open) && minutes <= toMin(h.store_close);
  if (quick) return { open: true, title: "Open", line: `${h.quick_eta_min}-${h.quick_eta_max} min`, detail: `Quick delivery in ${h.quick_eta_min}-${h.quick_eta_max} minutes` };
  if (store) return { open: true, title: "Open", line: "Slots + pickup", detail: "Quick delivery is closed for today. Book a 2-hour slot or pick up at the counter." };
  const opensToday = minutes < toMin(h.store_open);
  return { open: false, title: "Closed", line: `Opens ${opensToday ? "" : "tmrw "}${fmt12(h.store_open)}`, detail: `We open ${opensToday ? "today" : "tomorrow"} at ${fmt12(h.store_open)}. You can still order for a slot.` };
}

export function hoursSummary(h: StoreHours) {
  return [
    { label: "Store", value: `${fmt12(h.store_open)} to ${fmt12(h.store_close)}` },
    { label: "Deliveries", value: `${fmt12(h.delivery_start)} onwards` },
    { label: "Last quick order", value: fmt12(h.quick_last_order) },
  ];
}
