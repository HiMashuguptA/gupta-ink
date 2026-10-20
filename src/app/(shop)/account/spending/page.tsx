import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { LiveRefresh } from "@/components/live/LiveRefresh";
import { rupeesWhole as rupees } from "@/lib/format";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { BarList } from "@/components/charts/BarList";

export const metadata = { title: "My spending" };

type Spending = { spent: number; orders: number; saved: number; coins_earned: number;
  months: { month: string; spent: number; orders: number }[]; categories: { name: string; spent: number }[] };

export default async function SpendingPage() {
  const { supabase, user } = await getSessionProfile();
  if (!user) redirect("/login?next=/account/spending");
  const { data } = await supabase.rpc("my_spending");
  const s = data as unknown as Spending | null;
  const month = (m: string) => new Date(`${m}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" });

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
      <LiveRefresh at={Date.now()} id={`acct-spending-${user.id}`} watch={[{ table: "orders", filter: `user_id=eq.${user.id}` }, { table: "returns", filter: `user_id=eq.${user.id}` }]} />
      <div className="flex items-center gap-2">
        <Link href="/account" className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label="Account"><ChevronLeft className="size-5" /></Link>
        <h1 className="text-2xl font-extrabold">My spending</h1>
      </div>
      {!s ? <p className="mt-4 text-sm text-muted">Couldn&apos;t load your spending right now.</p> : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-ink p-4 text-white"><p className="text-sm text-white/70">Spent with us</p><p className="font-display text-2xl font-extrabold">{rupees(s.spent)}</p><p className="text-xs text-white/70">{s.orders} order{s.orders === 1 ? "" : "s"}, after refunds</p></div>
            <div className="rounded-2xl border border-line bg-card p-4"><p className="text-sm text-muted">You saved</p><p className="font-display text-2xl font-extrabold text-ok">{rupees(s.saved)}</p><p className="text-xs text-muted">Discounts, coupons and coins · {s.coins_earned} coins earned</p></div>
          </div>
          <section className="mt-4 rounded-2xl border border-line bg-card p-4">
            <h2 className="font-bold">Last 6 months</h2>
            <p className="mb-3 text-xs text-muted">Tap a bar for the amount.</p>
            <ColumnChart kind="rupees" height={180} labelEvery={1} caption="Spending per month"
              data={s.months.map((m) => ({ key: m.month, label: month(m.month), value: m.spent, detail: `${m.orders} order${m.orders === 1 ? "" : "s"}` }))} />
          </section>
          <section className="mt-4 rounded-2xl border border-line bg-card p-4">
            <h2 className="font-bold">What you buy most</h2>
            <div className="mt-3"><BarList rows={s.categories.map((c) => ({ name: c.name, value: c.spent }))} format={rupees} empty="Your categories show up after your first order." /></div>
          </section>
        </>
      )}
    </div>
  );
}
