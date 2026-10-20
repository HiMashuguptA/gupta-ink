import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminHome() {
  const sb = await supabaseServer();
  const [products, groups, users, lowStock, searches] = await Promise.all([
    sb.from("products").select("id", { count: "exact", head: true }),
    sb.from("product_groups").select("id", { count: "exact", head: true }),
    sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("product_cards").select("id, name, variant_label, stock").lte("stock", 10).order("stock").limit(8),
    sb.from("search_logs").select("term, results_count").order("created_at", { ascending: false }).limit(200),
  ]);

  const counts = new Map<string, { n: number; zero: boolean }>();
  for (const s of searches.data ?? []) {
    const c = counts.get(s.term) ?? { n: 0, zero: s.results_count === 0 };
    counts.set(s.term, { n: c.n + 1, zero: c.zero && s.results_count === 0 });
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8);

  const stats = [
    { label: "Total SKUs", value: products.count ?? 0 },
    { label: "Product groups", value: groups.count ?? 0 },
    { label: "Customers and staff", value: users.count ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Overview</h1>
      <p className="mt-1 text-sm text-muted">Orders, revenue and return charts arrive with checkout in the next phase.</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-4">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-3xl font-extrabold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-bold">Low stock</h2>
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
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-bold">Most searched (last 200 searches)</h2>
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
