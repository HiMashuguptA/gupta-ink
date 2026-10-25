import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Package, Heart, MapPin, Coins, Bell, ShieldCheck, Bike, LayoutDashboard, FileText, BarChart3 } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { LiveRefresh } from "@/components/live/LiveRefresh";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ReferralCard } from "@/components/account/ReferralCard";
import { SignOutButton } from "@/components/account/SignOutButton";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login?next=/account");
  const { data: wallet } = await supabase.from("wallets").select("coin_balance, pending_fine_paise").eq("user_id", user.id).single();

  const links = [
    { href: "/orders", label: "Orders", icon: Package },
    { href: "/wishlist", label: "Wishlist", icon: Heart },
    { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
    { href: "/account/coins", label: `SuperCoins and referrals: ${wallet?.coin_balance ?? 0} coins`, icon: Coins },
    { href: "/account/spending", label: "My spending", icon: BarChart3 },
    { href: "/account/notifications", label: "Notifications", icon: Bell },
    { href: "/policies/privacy", label: "Privacy and policies", icon: FileText },
  ];

  return (
    <div className="grid gap-5 px-4 pt-4 md:grid-cols-[1fr_1fr]">
      <LiveRefresh at={Date.now()} id={`acct-account-${user.id}`} watch={[{ table: "wallets", filter: `user_id=eq.${user.id}` }]} />
      <div>
        <div className="flex items-center gap-3">
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="size-14 rounded-full" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1 className="text-2xl font-extrabold">{profile.name ?? "Your account"}</h1>
            <p className="text-sm text-muted">{profile.email}</p>
          </div>
        </div>

        {(profile.role === "admin" || profile.role === "delivery_agent") && (
          <div className="mt-4 grid gap-2">
            {profile.role === "admin" && (
              <Link href="/admin" className="flex items-center gap-3 rounded-2xl bg-ink p-4 font-semibold text-white"><LayoutDashboard className="size-5" /> Open admin panel <ChevronRight className="ml-auto size-5" /></Link>
            )}
            {(profile.role === "delivery_agent" || profile.role === "admin") && (
              <Link href="/agent" className="flex items-center gap-3 rounded-2xl border border-ink p-4 font-semibold text-ink"><Bike className="size-5" /> Delivery agent portal <ChevronRight className="ml-auto size-5" /></Link>
            )}
          </div>
        )}

        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 p-4 text-sm font-semibold hover:bg-paper">
                <Icon className="size-5 text-ink" /> {label}
                <ChevronRight className="ml-auto size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>

        {(wallet?.pending_fine_paise ?? 0) > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-nib-soft px-3 py-2 text-sm"><ShieldCheck className="size-4 text-nib" /> A cancellation fine of ₹{(wallet!.pending_fine_paise / 100).toFixed(0)} will be added to your next order.</p>
        )}

        <div className="mt-4"><SignOutButton /></div>
      </div>

      <div className="grid content-start gap-5">
        <ReferralCard code={profile.referral_code} />
        <section>
          <h2 className="mb-2 text-lg font-bold">Your details</h2>
          <ProfileForm initial={{ id: profile.id, email: profile.email, name: profile.name, phone: profile.phone }} />
        </section>
      </div>
    </div>
  );
}
