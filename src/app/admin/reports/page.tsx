import Link from "next/link";
import clsx from "clsx";
import { getSessionProfile } from "@/lib/supabase/server";
import { istNow } from "@/lib/hours";
import { rupeesWhole as rupees } from "@/lib/format";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { BarList } from "@/components/charts/BarList";
import { StatTile } from "@/components/charts/StatTile";

export const metadata = { title: "Reports" };

type Report = {
  from: string; to: string;
  totals: { revenue: number; orders: number; customers: number; coupon_cost: number; coin_cost: number; delivery_fees: number; units: number };
  prev: { revenue: number; orders: number; customers: number };
  cancelled: number; refunds: number; new_customers: number;
  daily: { date: string; revenue: number; orders: number }[];
  hours: { hour: number; orders: number }[];
  categories: { name: string; revenue: number; units: number }[];
  products: { name: string; variant_label: string | null; units: number; revenue: number }[];
  customers: { name: string | null; email: string | null; orders: number; spend: number; last_order: string }[];
  types: { name: string; orders: number; revenue: number }[];
  payments: { name: string; orders: number; revenue: number }[];
};

const PRESETS = [{ key: "7", label: "7 days" }, { key: "30", label: "30 days" }, { key: "90", label: "90 days" }, { key: "365", label: "1 year" }];
const TYPE_LABEL: Record<string, string> = { quick: "Quick delivery", scheduled: "Scheduled", pickup: "Store pickup" };
const PAY_LABEL: Record<string, string> = { upi: "UPI", cod: "Cash on delivery", counter: "Paid at counter" };
const addDays = (d: string, n: number) => new Date(new Date(`${d}T12:00:00+05:30`).getTime() + n * 864e5).toISOString().slice(0, 10);
const day = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...o });
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`;

export default async function Reports({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = istNow().date;
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
  const custom = valid(sp.from) && valid(sp.to);
  const range = custom ? "custom" : PRESETS.some((p) => p.key === sp.range) ? sp.range! : "30";
  const to = custom ? valid(sp.to)! : today;
  const from = custom ? valid(sp.from)! : addDays(today, -(Number(range) - 1));

  const { supabase } = await getSessionProfile();
  const { data, error } = await supabase.rpc("admin_report", { p_from: from, p_to: to });
  const r = data as unknown as Report | null;
  const aov = r && r.totals.orders ? Math.round(r.totals.revenue / r.totals.orders) : 0;
  const prevAov = r && r.prev.orders ? Math.round(r.prev.revenue / r.prev.orders) : 0;
  const long = r ? r.daily.length > 45 : false;

  // Long ranges read better as weeks
  const series = !r ? [] : long
    ? Object.values(r.daily.reduce<Record<string, { key: string; label: string; value: number; orders: number }>>((acc, d, i) => {
        const k = String(Math.floor(i / 7));
        acc[k] ??= { key: d.date, label: day(d.date, { day: "numeric", month: "short" }), value: 0, orders: 0 };
        acc[k].value += d.revenue; acc[k].orders += d.orders;
        return acc;
      }, {})).map((w) => ({ key: w.key, label: w.label, value: w.value, detail: `${w.orders} orders, week from ${w.label}` }))
    : r.daily.map((d) => ({ key: d.date, label: day(d.date, { day: "numeric", month: "short" }), value: d.revenue, detail: `${d.orders} order${d.orders === 1 ? "" : "s"}` }));

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-extrabold">Reports</h1>
      <p className="mt-1 text-sm text-muted">{day(from, { day: "numeric", month: "short", year: "numeric" })} to {day(to, { day: "numeric", month: "short", year: "numeric" })}. Cancelled orders are left out.</p>

      {/* Filters: one row above the charts */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Link key={p.key} href={`/admin/reports?range=${p.key}`} aria-current={range === p.key ? "page" : undefined}
            className={clsx("inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-semibold", range === p.key ? "border-ink bg-ink text-white" : "border-line bg-card")}>{p.label}</Link>
        ))}
        <form className="flex flex-wrap items-center gap-2 text-sm" action="/admin/reports">
          <input type="date" name="from" defaultValue={from} max={today} aria-label="From" className="h-9 rounded-lg border border-line bg-card px-2" />
          <span className="text-muted">to</span>
          <input type="date" name="to" defaultValue={to} max={today} aria-label="To" className="h-9 rounded-lg border border-line bg-card px-2" />
          <button className={clsx("h-9 rounded-full border px-3.5 font-semibold", range === "custom" ? "border-ink bg-ink text-white" : "border-line bg-card")}>Apply</button>
        </form>
      </div>

      {error || !r ? <p className="mt-6 rounded-2xl bg-margin/10 p-4 text-sm text-margin">{error?.message ?? "Couldn't load the report."}</p> : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Sales" value={rupees(r.totals.revenue)} now={r.totals.revenue} before={r.prev.revenue} />
            <StatTile label="Orders" value={r.totals.orders.toLocaleString("en-IN")} now={r.totals.orders} before={r.prev.orders} />
            <StatTile label="Average order" value={rupees(aov)} now={aov} before={prevAov} />
            <StatTile label="Customers" value={r.totals.customers.toLocaleString("en-IN")} now={r.totals.customers} before={r.prev.customers} hint={`${r.new_customers} first-time`} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Items sold" value={r.totals.units.toLocaleString("en-IN")} hint={`${r.new_customers} first-time customers`} />
            <StatTile label="Coupons and coins given" value={rupees(r.totals.coupon_cost + r.totals.coin_cost)} hint={`${rupees(r.totals.coupon_cost)} coupons, ${rupees(r.totals.coin_cost)} coins`} />
            <StatTile label="Refunds paid" value={rupees(r.refunds)} hint="Returns and cancelled orders" />
            <StatTile label="Cancelled orders" value={String(r.cancelled)} hint={r.totals.orders + r.cancelled ? `${Math.round((r.cancelled / (r.totals.orders + r.cancelled)) * 100)}% of all orders` : undefined} />
          </div>

          <section className="mt-5 rounded-2xl border border-line bg-card p-4">
            <h2 className="font-bold">Sales per {long ? "week" : "day"}</h2>
            <p className="mb-3 text-xs text-muted">Hover or tap a bar for the exact amount.</p>
            <ColumnChart data={series} kind="rupees" caption={`Sales per ${long ? "week" : "day"}`} />
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-card p-4">
              <h2 className="font-bold">Sales by category</h2>
              <p className="mb-3 text-xs text-muted">Item value after returns.</p>
              <BarList rows={r.categories.map((c) => ({ name: c.name, value: c.revenue, note: `${c.units} sold` }))} format={rupees} sub={(x) => x.note} />
            </section>
            <section className="rounded-2xl border border-line bg-card p-4">
              <h2 className="font-bold">Busiest hours</h2>
              <p className="mb-3 text-xs text-muted">Orders placed by hour of day (India time).</p>
              <ColumnChart data={r.hours.filter((h) => h.hour >= 7 && h.hour <= 22).map((h) => ({ key: String(h.hour), label: hourLabel(h.hour), value: h.orders }))}
                kind="count" height={170} labelEvery={2} caption="Orders by hour of day" />
            </section>
            <section className="rounded-2xl border border-line bg-card p-4">
              <h2 className="font-bold">How customers got their orders</h2>
              <div className="mt-3"><BarList rows={r.types.map((t) => ({ name: TYPE_LABEL[t.name] ?? t.name, value: t.orders, note: rupees(t.revenue) }))} format={(v) => `${v} orders`} sub={(x) => x.note} /></div>
            </section>
            <section className="rounded-2xl border border-line bg-card p-4">
              <h2 className="font-bold">How customers paid</h2>
              <div className="mt-3"><BarList rows={r.payments.map((t) => ({ name: PAY_LABEL[t.name] ?? t.name, value: t.orders, note: rupees(t.revenue) }))} format={(v) => `${v} orders`} sub={(x) => x.note} /></div>
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-card p-4">
              <h2 className="font-bold">Best sellers</h2>
              <table className="mt-3 w-full text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-semibold">Product</th><th className="pb-2 pl-3 text-right font-semibold">Sold</th><th className="pb-2 pl-3 text-right font-semibold">Sales</th></tr></thead>
                <tbody>
                  {r.products.map((p, i) => (
                    <tr key={i} className="border-t border-line"><td className="py-2"><span className="font-semibold">{p.name}</span>{p.variant_label && <span className="text-muted"> · {p.variant_label}</span>}</td>
                      <td className="py-2 pl-3 text-right tabular-nums">{p.units}</td><td className="py-2 pl-3 text-right tabular-nums">{rupees(p.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
              {!r.products.length && <p className="py-4 text-sm text-muted">No sales in this period.</p>}
            </section>
            <section className="rounded-2xl border border-line bg-card p-4">
              <h2 className="font-bold">Top customers by spend</h2>
              <table className="mt-3 w-full text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-semibold">Customer</th><th className="pb-2 pl-3 text-right font-semibold">Orders</th><th className="pb-2 pl-3 text-right font-semibold">Spent</th></tr></thead>
                <tbody>
                  {r.customers.map((c, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-2"><span className="font-semibold">{c.name ?? "Customer"}</span><span className="block text-xs text-muted">{c.email} · last {new Date(c.last_order).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}</span></td>
                      <td className="py-2 pl-3 text-right tabular-nums">{c.orders}</td><td className="py-2 pl-3 text-right tabular-nums">{rupees(c.spend)}</td></tr>
                  ))}
                </tbody>
              </table>
              {!r.customers.length && <p className="py-4 text-sm text-muted">No customers in this period.</p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
