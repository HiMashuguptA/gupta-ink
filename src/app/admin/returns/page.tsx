import Link from "next/link";
import clsx from "clsx";
import { getSessionProfile } from "@/lib/supabase/server";
import { rupees } from "@/lib/format";
import { RETURN_LABEL, returnTone, type ReturnStatus } from "@/lib/returns";

export const metadata = { title: "Returns and refunds" };

const TABS: { key: string; label: string; statuses: ReturnStatus[] }[] = [
  { key: "new", label: "To review", statuses: ["requested"] },
  { key: "pickup", label: "Pickup", statuses: ["approved", "pickup_assigned", "picked_up"] },
  { key: "refund", label: "To refund", statuses: ["received"] },
  { key: "done", label: "Done", statuses: ["refunded", "rejected"] },
];

type Row = { id: string; status: ReturnStatus; refund_amount_paise: number; reason: string; created_at: string; items: { name: string; qty: number }[];
  orders: { order_no: string; type: string } | null; profiles: { name: string | null } | null };

export default async function AdminReturns({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "new" } = await searchParams;
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const { supabase } = await getSessionProfile();
  const [rows, counts, cancelRefunds] = await Promise.all([
    supabase.from("returns").select("id, status, refund_amount_paise, reason, created_at, items, orders(order_no, type), profiles!returns_user_id_fkey(name)")
      .in("status", current.statuses).order("created_at", { ascending: current.key !== "done" }).limit(100),
    supabase.from("returns").select("status").neq("status", "refunded").neq("status", "rejected"),
    supabase.from("orders").select("id, order_no, refund_due_paise, refund_upi_id, cancelled_at").eq("status", "cancelled").gt("refund_due_paise", 0).is("refunded_at", null).order("cancelled_at"),
  ]);
  const n = (k: string) => (counts.data ?? []).filter((r) => TABS.find((t) => t.key === k)!.statuses.includes(r.status as ReturnStatus)).length;
  const list = (rows.data ?? []) as unknown as Row[];

  return (
    <div className="max-w-5xl">
      <h1 className="text-[34px] uppercase">Returns and refunds</h1>
      <p className="mt-1 text-sm text-muted">Review requests, arrange pickups, then pay refunds by UPI and upload the screenshot.</p>

      {(cancelRefunds.data ?? []).length > 0 && (
        <section className="mt-5 rounded-[12px] border-[1.5px] border-margin/40 bg-card p-4">
          <h2 className="font-bold">Refunds due on cancelled orders</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {(cancelRefunds.data ?? []).map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2">
                <Link href={`/admin/orders/${o.id}`} className="font-bold text-ink hover:underline">{o.order_no}</Link>
                <span className="text-muted">{o.refund_upi_id ?? "UPI ID missing"}</span>
                <b className="ml-auto">{rupees(o.refund_due_paise)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/returns?tab=${t.key}`} aria-current={t.key === current.key ? "page" : undefined}
            className={clsx("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold",
              t.key === current.key ? "border-ink bg-ink text-on-ink" : "border-line bg-card")}>
            {t.label}{t.key !== "done" && n(t.key) > 0 && <span className={clsx("grid min-w-5 place-items-center rounded-full px-1 text-[11px]", t.key === current.key ? "bg-white/20" : "bg-nib text-ink-deep")}>{n(t.key)}</span>}
          </Link>
        ))}
      </div>

      <ul className="mt-4 grid gap-2.5 md:hidden">
        {list.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/returns/${r.id}`} className="block rounded-[12px] bg-card p-3.5 text-sm active:bg-paper">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-bold text-ink">{r.orders?.order_no ?? "Order"}</p>
                  <p className="text-xs text-muted">{r.profiles?.name ?? "Customer"} · {new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p></div>
                <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", returnTone(r.status))}>{RETURN_LABEL[r.status]}</span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div className="min-w-0"><p className="line-clamp-1">{r.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p><p className="line-clamp-1 text-xs text-muted">{r.reason}</p></div>
                <p className="shrink-0 font-bold">{rupees(r.refund_amount_paise)}</p>
              </div>
            </Link>
          </li>
        ))}
        {!list.length && <li className="rounded-[12px] bg-card p-6 text-center text-sm text-muted">Nothing here right now.</li>}
      </ul>
      <div className="mt-4 hidden overflow-x-auto rounded-[12px] bg-card md:block">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="text-left text-muted">
            <th className="p-3 font-semibold">Order</th><th className="p-3 font-semibold">Customer</th><th className="p-3 font-semibold">Items</th>
            <th className="p-3 text-right font-semibold">Refund</th><th className="p-3 font-semibold">Status</th>
          </tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-paper">
                <td className="p-3"><Link href={`/admin/returns/${r.id}`} className="font-bold text-ink hover:underline">{r.orders?.order_no ?? "Order"}</Link>
                  <span className="block text-xs text-muted">{new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></td>
                <td className="p-3">{r.profiles?.name ?? "Customer"}</td>
                <td className="p-3"><span className="line-clamp-1">{r.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</span><span className="block text-xs text-muted line-clamp-1">{r.reason}</span></td>
                <td className="p-3 text-right font-bold">{rupees(r.refund_amount_paise)}</td>
                <td className="p-3"><span className={clsx("rounded-full px-2.5 py-1 text-xs font-bold", returnTone(r.status))}>{RETURN_LABEL[r.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-6 text-center text-sm text-muted">Nothing here right now.</p>}
      </div>
    </div>
  );
}
