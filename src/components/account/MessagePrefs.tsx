"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import clsx from "clsx";
import { useSession } from "@/components/providers/SessionProvider";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Account: choose how the shop may reach you. In-app notifications always stay on. */
export function MessagePrefs() {
  const { profile, refresh } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!profile) return <div className="skeleton h-[124px] rounded-[12px]" />;
  const hasPhone = /^[6-9]\d{9}$/.test(profile.phone ?? "");

  const set = async (key: "wa" | "email", value: boolean) => {
    setBusy(key); setErr(null);
    const { error } = await supabaseBrowser().rpc("set_message_prefs", key === "wa" ? { p_wa: value } : { p_email: value });
    if (error) setErr(error.message);
    await refresh();
    setBusy(null);
  };

  const Row = ({ k, icon: Icon, title, hint, on, disabled }: { k: "wa" | "email"; icon: typeof Mail; title: string; hint: React.ReactNode; on: boolean; disabled?: boolean }) => (
    <label className={clsx("flex items-start gap-3 p-4", disabled ? "opacity-60" : "cursor-pointer")}>
      <Icon className="mt-0.5 size-5 shrink-0 text-ink" />
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted">{hint}</span></span>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" role="switch" checked={on} disabled={disabled || busy === k} onChange={(e) => void set(k, e.target.checked)} className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed" aria-label={title} />
        <span className="absolute inset-0 rounded-full bg-rule transition-colors duration-200 peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink/40" />
        <span className="absolute left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 [transition-timing-function:var(--ease-out)] peer-checked:translate-x-5" />
      </span>
    </label>
  );

  return (
    <div className="divide-y divide-line rounded-[12px] bg-card">
      <Row k="wa" icon={MessageCircle} title="WhatsApp updates" on={!!profile.wa_opt_in} disabled={!hasPhone}
        hint={hasPhone ? `Order updates and the odd offer on +91 ${profile.phone}` : <>Add your mobile number in <Link href="#details" className="font-semibold text-ink underline">your details</Link> first</>} />
      <Row k="email" icon={Mail} title="Offers by email" on={profile.email_offers !== false} hint="New coupons and arrivals. Delivery codes always come by email." />
      {err && <p className="p-3 text-sm text-margin" role="alert">{err}</p>}
    </div>
  );
}
