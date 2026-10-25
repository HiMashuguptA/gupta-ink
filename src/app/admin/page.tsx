import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { istNow } from "@/lib/hours";
import { Num, Price } from "@/components/ui/Num";

export default async function AdminHome() {
  const sb = await supabaseServer();
  // Midnight in Kohima, as an absolute timestamp
  const istMidnight = `${istNow().date}T00:00:00+05:30`;
  const [products, groups, users, lowStock, searches, today, open, refunds, returnsDue, returnsNew] = await Promise.all([
    sb.from("products").select("id", { count: "exact", head: true }),
    sb.from("product_groups").select("id", { count: "exact", head: true }),
    sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("product_cards").select("id, name, variant_label, stock").lte("stock", 10).order("stock").limit(8),
    sb.from("search_logs").select("term, results_count").order("created_at", { ascending: false }).limit(200),
    sb.from("orders").select("payable_paise, status").gte("created_at", istMidnight),
    sb.from("orders").select("id", { count: "exact", head: true }).in("status", ["placed", "confirmed", "getting_ready", "packed", "agent_assigned", "agent_accepted", "out_for_delivery", "ready_for_pickup"]),
    sb.from("orders").select("refund_due_paise").eq("status", "cancelled").gt("refund_due_paise", 0).is("refunded_at", null),
    sb.from("returns").select("refund_amount_paise").eq("status", "received"),
    sb.from("returns").select("id", { count: "exact", head: true }).eq("status", "requested"),
  ]);
  const todays = (today.data ?? []).filter((o) => o.status !== "cancelled");

  const counts = new Map<string, { n: number; zero: boolean }>();
  for (const s of searches.data ?? []) {
    const c = counts.get(s.term) ?? { n: 0, zero: s.results_count === 0 };
    counts.set(s.term, { n: c.n + 1, zero: c.zero && s.results_count === 0 });
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8);

  const revenue = todays.reduce((a, o) => a + o.payable_paise, 0);
  const refundsDue = (refunds.data ?? []).reduce((a, o) => a + o.refund_due_paise, 0) + (returnsDue.data ?? []).reduce((a, r) => a + r.refund_amount_paise, 0);
  // Things waiting on the owner, as rows that open their queue
  const actions = [
    { label: "Open orders", note: "Confirm, pack and hand over", n: open.count ?? 0, href: "/admin/orders" },
    { label: "Returns to review", note: "Approve or decline requests", n: returnsNew.count ?? 0, href: "/admin/returns" },
    { label: "Refunds to pay", note: "Send the money back by UPI", n: refundsDue, money: true, href: "/admin/returns?tab=refund" },
  ];


  return (
    <div>
      <h1 className="text-[34px] uppercase">Overview</h1>
      <p className="mt-1 text-sm text-muted">Today at the store. Charts and best-sellers are in Reports.</p>
      <div className="mt-5 grid gap-2.5 lg:grid-cols-[1fr_1.4fr]">
        <dl className="grid grid-cols-2 gap-2.5">
          <div className="reveal rounded-[12px] bg-sign p-4 text-on-sign"><dt className="text-sm text-on-sign-muted">Orders today</dt><dd className="sign-type mt-1.5 text-[44px]"><Num value={todays.length} /></dd></div>
          <div className="reveal rounded-[12px] bg-card p-4" style={{ "--i": 1 } as React.CSSProperties}><dt className="text-sm text-muted">Revenue today</dt><dd className="sign-type mt-1.5 text-[44px] text-graphite"><Price paise={revenue} /></dd></div>
        </dl>
        <ul className="divide-y divide-line rounded-[12px] bg-card" aria-label="Waiting on you">
          {actions.map((a, k) => (
            <li key={a.label} className="reveal" style={{ "--i": k + 2 } as React.CSSProperties}>
              <Link href={a.href} className="group flex items-center gap-3 px-4 py-3 first:rounded-t-[12px] last:rounded-b-[12px] hover:bg-sunk">
                <span className="min-w-0 flex-1"><span className="block font-semibold">{a.label}</span><span className="block text-xs text-muted">{a.note}</span></span>
                <span className={`sign-type text-[26px] ${a.n ? "text-graphite" : "text-muted"}`}>{a.money ? <Price paise={a.n} /> : <Num value={a.n} />}</span>
                <ChevronRight className="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="num mt-3 text-sm text-muted">{products.count ?? 0} SKUs in {groups.count ?? 0} products on the shelf · {users.count ?? 0} customers and staff</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-[12px] bg-card p-4">
          <h2 className="text-[22px] uppercase">Low stock</h2>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="py-1 font-semibold">Product</th><th className="py-1 text-right font-semibold">Units left</th></tr></thead>
            <tbody>
              {(lowStock.data ?? []).map((p) => (
                <tr key={p.id} className="border-t border-line"><td className="py-2">{p.name}{p.variant_label ? `, ${p.variant_label}` : ""}</td><td className={`py-2 text-right font-bold ${(p.stock ?? 0) <= 5 ? "text-margin" : ""}`}>{p.stock}</td></tr>
              ))}
            </tbody>
          </table>
          {!lowStock.data?.length && <p className="mt-2 text-sm text-muted">Everything is well stocked.</p>}
        </section>
        <section className="rounded-[12px] bg-card p-4">
          <h2 className="text-[22px] uppercase">Most searched</h2><p className="text-xs text-muted">Last 200 searches</p>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="py-1 font-semibold">Term</th><th className="py-1 text-right font-semibold">Searches</th></tr></thead>
            <tbody>
              {top.map(([term, c]) => (
                <tr key={term} className="border-t border-line"><td className="py-2">{term}{c.zero && <span className="ml-2 rounded bg-nib-soft px-1.5 py-0.5 text-xs font-semibold">no results</span>}</td><td className="py-2 text-right font-bold">{c.n}</td></tr>
              ))}
            </tbody>
          </table>
          {!top.length && <p className="mt-2 text-sm text-muted">No searches yet.</p>}
        </section>
      </div>
    </div>
  );
}
