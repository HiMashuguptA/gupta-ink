import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Package, Heart, MapPin, Coins, Bell, ShieldCheck, Bike, LayoutDashboard, FileText, BarChart3 } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { LiveRefresh } from "@/components/live/LiveRefresh";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ReferralCard } from "@/components/account/ReferralCard";
import { SignOutButton } from "@/components/account/SignOutButton";
import { ThemeToggle } from "@/components/account/ThemeToggle";
import { BuddySettings } from "@/components/account/BuddySettings";
import { MessagePrefs } from "@/components/account/MessagePrefs";
import { Num } from "@/components/ui/Num";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login?next=/account");
  const { data: wallet } = await supabase.from("wallets").select("coin_balance, pending_fine_paise").eq("user_id", user.id).single();

  const links = [
    { href: "/orders", label: "Orders", icon: Package },
    { href: "/wishlist", label: "Wishlist", icon: Heart },
    { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
    { href: "/account/coins", label: "SuperCoins and referrals", icon: Coins },
    { href: "/account/spending", label: "My spending", icon: BarChart3 },
    { href: "/account/notifications", label: "Notifications", icon: Bell },
    { href: "/policies/privacy", label: "Privacy and policies", icon: FileText },
  ];

  return (
    <div className="grid gap-5 px-4 pt-4 md:grid-cols-[1fr_1fr]">
      <LiveRefresh at={Date.now()} id={`acct-account-${user.id}`} watch={[{ table: "wallets", filter: `user_id=eq.${user.id}` }]} />
      <div>
        <div className="keyline relative rounded-[14px] bg-sign p-5 text-on-sign" style={{ "--keyline": "rgb(245 184 0 / 0.5)", "--shade": "#04261d" } as React.CSSProperties}>
          <div className="flex items-center gap-3">
            {profile.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="size-14 rounded-full ring-[3px] ring-nib" referrerPolicy="no-referrer" />
            )}
            <div className="min-w-0">
              <h1 className="sign-type sign-shade truncate text-[34px] text-on-sign">{profile.name ?? "Your account"}</h1>
              <p className="truncate text-sm text-on-sign-muted">{profile.email}</p>
            </div>
          </div>
          <Link href="/account/coins" className="press mt-4 flex items-center justify-between rounded-[10px] bg-nib px-4 py-3 text-on-nib">
            <span className="text-sm font-bold">SuperCoins</span>
            <span className="sign-type text-[28px]"><Num value={wallet?.coin_balance ?? 0} /></span>
          </Link>
        </div>

        {(profile.role === "admin" || profile.role === "delivery_agent") && (
          <div className="mt-4 grid gap-2">
            {profile.role === "admin" && (
              <Link href="/admin" className="press flex items-center gap-3 rounded-[12px] bg-ink p-4 font-semibold text-on-ink"><LayoutDashboard className="size-5" /> Open admin panel <ChevronRight className="ml-auto size-5" /></Link>
            )}
            {(profile.role === "delivery_agent" || profile.role === "admin") && (
              <Link href="/agent" className="press flex items-center gap-3 rounded-[12px] bg-card p-4 font-semibold text-ink ring-1 ring-inset ring-ink/30"><Bike className="size-5" /> Delivery agent portal <ChevronRight className="ml-auto size-5" /></Link>
            )}
          </div>
        )}

        <ul className="mt-4 divide-y divide-line rounded-[12px] bg-card">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="group flex items-center gap-3 p-4 text-sm font-semibold first:rounded-t-[12px] last:rounded-b-[12px] hover:bg-sunk">
                <Icon className="size-5 text-ink" /> {label}
                <ChevronRight className="ml-auto size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>

        {(wallet?.pending_fine_paise ?? 0) > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-[10px] bg-nib-soft px-3 py-2 text-sm"><ShieldCheck className="size-4 text-nib" /> A cancellation fine of ₹{(wallet!.pending_fine_paise / 100).toFixed(0)} will be added to your next order.</p>
        )}

        <section className="mt-5">
          <h2 className="mb-2 text-[22px] uppercase">Appearance</h2>
          <ThemeToggle />
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-[22px] uppercase">Shop buddy</h2>
          <BuddySettings />
        </section>

        <div className="mt-4"><SignOutButton /></div>
      </div>

      <div className="grid content-start gap-5">
        <ReferralCard code={profile.referral_code} />
        <section id="details" className="scroll-mt-24">
          <h2 className="mb-2 text-[24px] uppercase">Your details</h2>
          <ProfileForm initial={{ id: profile.id, email: profile.email, name: profile.name, phone: profile.phone }} />
        </section>
        <section>
          <h2 className="mb-2 text-[24px] uppercase">Messages from the shop</h2>
          <MessagePrefs />
        </section>
      </div>
    </div>
  );
}
