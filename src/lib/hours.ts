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
