import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, Coins, Clock, Gift, ShoppingBag, Hourglass } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { getSettings } from "@/lib/catalog";
import { ReferralCard } from "@/components/account/ReferralCard";

export const metadata = { title: "SuperCoins" };

type Entry = { id: string; entry: "earn" | "spend" | "expire" | "referral" | "restore" | "adjust"; amount: number; remaining: number; note: string | null; expires_at: string | null; created_at: string };

const fmt = (t: string) => new Date(t).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

export default async function CoinsPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login?next=/account/coins");
  const [wallet, ledger, refs, pending, settings] = await Promise.all([
    supabase.from("wallets").select("coin_balance").eq("user_id", user.id).single(),
    supabase.from("coin_ledger").select("id, entry, amount, remaining, note, expires_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
    supabase.from("referrals").select("id, status, referrer_id, created_at").or(`referrer_id.eq.${user.id},referee_id.eq.${user.id}`),
    supabase.from("orders").select("coins_to_earn, order_no, return_window_ends_at, status").eq("user_id", user.id).in("status", ["delivered", "collected"]).eq("coins_credited", false),
    getSettings(),
  ]);
  const entries = (ledger.data ?? []) as Entry[];
  const balance = wallet.data?.coin_balance ?? 0;
  const now = Date.now();
  const expiring = entries.filter((e) => e.remaining > 0 && e.expires_at && new Date(e.expires_at).getTime() - now < 3 * 864e5)
    .reduce((a, e) => a + e.remaining, 0);
  const soonest = entries.filter((e) => e.remaining > 0 && e.expires_at).map((e) => e.expires_at!).sort()[0];
  const onTheWay = (pending.data ?? []).reduce((a, o) => a + (o.coins_to_earn ?? 0), 0);
  const mine = (refs.data ?? []).filter((r) => r.referrer_id === user.id);
  const joined = mine.length, rewarded = mine.filter((r) => r.status === "rewarded").length;
  const reward = settings?.referral_reward_coins ?? 50;
  const rate = (settings?.coin_rate_bp ?? 200) / 100, days = settings?.coin_expiry_days ?? 10;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
      <div className="flex items-center gap-2">
        <Link href="/account" className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label="Account"><ChevronLeft className="size-5" /></Link>
        <h1 className="text-2xl font-extrabold">SuperCoins</h1>
      </div>

      <section className="relative mt-4 overflow-hidden rounded-3xl bg-ink p-5 text-white">
        <Coins className="absolute -right-4 -top-4 size-32 text-white/10" aria-hidden />
        <p className="text-sm text-white/70">Your balance</p>
        <p className="font-display text-5xl font-extrabold">{balance}<span className="ml-2 text-lg font-bold text-nib">= ₹{balance}</span></p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {onTheWay > 0 && <span className="rounded-full bg-white/15 px-3 py-1">+{onTheWay} on the way</span>}
          {expiring > 0 && <span className="rounded-full bg-nib px-3 py-1 text-ink-deep">{expiring} expire by {fmt(soonest!)}</span>}
        </div>
        <Link href="/" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-ink"><ShoppingBag className="size-4" /> Use them on your next order</Link>
      </section>

      <section className="mt-4 grid gap-2 rounded-2xl border border-line bg-card p-4 text-sm sm:grid-cols-3">
        <p><b className="block">Earn {rate}%</b><span className="text-muted">of what you pay for items, credited after the {settings?.return_window_days ?? 3}-day return window.</span></p>
        <p><b className="block">1 coin = ₹1</b><span className="text-muted">Turn on SuperCoins at checkout. Delivery fees and fines can&apos;t be paid with coins.</span></p>
        <p><b className="block">Use within {days} days</b><span className="text-muted">Oldest coins are used first. We remind you 2 days before they lapse.</span></p>
      </section>

      <section id="refer" className="mt-6 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Gift className="size-5 text-ink" /> Invite friends, get {reward} coins each</h2>
        <p className="mt-1 text-sm text-muted">Your friend enters your code when they sign up. After their first order is delivered and its return window closes, you both get {reward} coins.</p>
        <div className="mt-3"><ReferralCard code={profile.referral_code} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl border border-line bg-card p-3"><p className="font-display text-2xl font-extrabold">{joined}</p><p className="text-xs text-muted">friends joined</p></div>
          <div className="rounded-2xl border border-line bg-card p-3"><p className="font-display text-2xl font-extrabold">{rewarded * reward}</p><p className="text-xs text-muted">coins earned from referrals</p></div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">History</h2>
        {entries.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">No coins yet. Place an order and they&apos;ll show up here after the return window.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-card">
            {entries.map((e) => {
              const plus = e.amount > 0;
              const live = e.remaining > 0 && e.expires_at;
              return (
                <li key={e.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full", plus ? "bg-ok/10 text-ok" : e.entry === "expire" ? "bg-margin/10 text-margin" : "bg-ink-soft text-ink")}>
                    {e.entry === "expire" ? <Hourglass className="size-4" /> : e.entry === "referral" ? <Gift className="size-4" /> : plus ? <Coins className="size-4" /> : <ShoppingBag className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{e.note ?? e.entry}</p>
                    <p className="text-xs text-muted">{fmt(e.created_at)}{live ? <> · <Clock className="inline size-3" /> {e.remaining} left until {fmt(e.expires_at!)}</> : ""}</p>
                  </div>
                  <b className={plus ? "text-ok" : "text-graphite"}>{plus ? "+" : ""}{e.amount}</b>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
