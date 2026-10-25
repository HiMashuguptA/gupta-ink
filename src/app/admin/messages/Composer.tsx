"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Bell, Mail, MessageCircle, Send, Ticket, Users } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";
import type { MsgStatus } from "./ChannelSetup";

export type CouponLite = {
  code: string; title: string; description: string | null; type: "percent" | "flat" | "free_delivery"; value: number;
  max_discount_paise: number | null; min_order_paise: number; valid_to: string | null; active: boolean;
};
type Channel = "inapp" | "email" | "whatsapp";
type Audience = "all" | "inactive" | "never_ordered";
type Counts = { total: number; email: number; whatsapp: number };

const AUDIENCES: { key: Audience; label: string; hint: string }[] = [
  { key: "all", label: "All customers", hint: "Everyone who has an account" },
  { key: "inactive", label: "Haven't ordered lately", hint: "No order in the last few days or weeks" },
  { key: "never_ordered", label: "Never ordered", hint: "Signed up but no order yet" },
];
const CHANNELS: { key: Channel; label: string; icon: typeof Bell }[] = [
  { key: "inapp", label: "In the app", icon: Bell },
  { key: "email", label: "Email", icon: Mail },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];

function offerText(c: CouponLite) {
  const what = c.type === "percent" ? `${c.value}% off${c.max_discount_paise ? ` (up to ${rupees(c.max_discount_paise)})` : ""}`
    : c.type === "flat" ? `${rupees(c.value)} off` : "free delivery";
  const min = c.min_order_paise > 0 ? ` on orders above ${rupees(c.min_order_paise)}` : "";
  const till = c.valid_to ? ` Valid till ${new Date(c.valid_to).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}.` : "";
  return { what, body: `Hi {name}, use code ${c.code} at checkout for ${what}${min}.${till}` };
}

const TEMPLATES = [
  { key: "miss", label: "We miss you", title: "We saved your favourites", body: "Hi {name}, it's been a while! Fresh notebooks, pens and exam supplies are in at Khedi Market. Order now and get it in under an hour.", link: "/", audience: "inactive" as Audience },
  { key: "new", label: "New arrivals", title: "New on the shelves", body: "Hi {name}, new stationery just arrived at Gupta Enterprises. Take a look before it sells out.", link: "/collections/trending", audience: "all" as Audience },
  { key: "first", label: "First order nudge", title: "Your first order is waiting", body: "Hi {name}, your account is ready. Pick what you need and we'll deliver it in 45 to 60 minutes.", link: "/", audience: "never_ordered" as Audience },
];

export function Composer({ coupons, initialCoupon, status }: { coupons: CouponLite[]; initialCoupon: string | null; status: MsgStatus | null }) {
  const router = useRouter();
  const sb = supabaseBrowser();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/");
  const [audience, setAudience] = useState<Audience>("all");
  const [days, setDays] = useState(30);
  const [channels, setChannels] = useState<Channel[]>(["inapp", "email"]);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pickCoupon = (code: string | null) => {
    setCoupon(code);
    const c = coupons.find((x) => x.code === code);
    if (!c) return;
    const t = offerText(c);
    setTitle(`New coupon: ${c.code} for ${t.what}`.slice(0, 80));
    setBody(t.body);
    setLink("/");
  };
  // Arrived from "Announce" on a coupon: fill the message in once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialCoupon) pickCoupon(initialCoupon); }, []);

  // Live count of who this reaches on each channel
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const { data } = await sb.rpc("admin_audience_count", { p_audience: audience, p_days: audience === "inactive" ? days : undefined });
      if (live) setCounts((data ?? null) as Counts | null);
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [sb, audience, days]);

  const reach = useMemo(() => ({
    inapp: channels.includes("inapp") ? counts?.total ?? 0 : 0,
    email: channels.includes("email") ? counts?.email ?? 0 : 0,
    whatsapp: channels.includes("whatsapp") ? counts?.whatsapp ?? 0 : 0,
  }), [channels, counts]);

  const first = "Asha";
  const preview = body.replaceAll("{name}", first);
  const ok = title.trim().length >= 3 && body.trim().length >= 3 && channels.length > 0 && /^\/\S*$/.test(link) && (reach.inapp + reach.email + reach.whatsapp) > 0;
  const waOff = !status?.settings?.wa_enabled;
  const mailOff = !status?.brevo_key;

  const send = async () => {
    setBusy(true); setMsg(null);
    const { data, error } = await sb.rpc("admin_send_campaign", { p: { title: title.trim(), body: body.trim(), link, channels, audience, inactive_days: audience === "inactive" ? days : null, coupon_code: coupon } });
    setBusy(false); setConfirm(false);
    if (error) return setMsg({ ok: false, text: error.message });
    const r = data as { inapp: number; email: number; whatsapp: number };
    setMsg({ ok: true, text: `Sent. ${r.inapp} in the app now${r.email ? `, ${r.email} emails` : ""}${r.whatsapp ? `, ${r.whatsapp} WhatsApp messages` : ""} going out a few each minute.` });
    setTitle(""); setBody(""); setCoupon(null);
    router.refresh();
  };

  const field = "mt-1 w-full rounded-[8px] border border-line bg-paper px-3 text-sm text-graphite caret-ink outline-none focus:border-ink";

  return (
    <section className="rounded-[14px] bg-card p-4 text-sm">
      <h2 className="text-[22px] uppercase">New message</h2>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button key={t.key} type="button" onClick={() => { setTitle(t.title); setBody(t.body); setLink(t.link); setAudience(t.audience); setCoupon(null); }}
            className="press h-8 rounded-full bg-sunk px-3 text-xs font-semibold hover:bg-ink-soft">{t.label}</button>
        ))}
      </div>

      {coupons.length > 0 && (
        <label className="mt-3 block font-semibold">
          <span className="inline-flex items-center gap-1.5"><Ticket className="size-4 text-ink" /> Announce a coupon</span>
          <select value={coupon ?? ""} onChange={(e) => pickCoupon(e.target.value || null)} className={`${field} h-10`}>
            <option value="">No coupon</option>
            {coupons.map((c) => <option key={c.code} value={c.code}>{c.code}: {c.title}</option>)}
          </select>
        </label>
      )}

      <label className="mt-3 block font-semibold">Title
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} className={`${field} h-10`} placeholder="Diwali offer: 20% off notebooks" />
      </label>
      <label className="mt-3 block font-semibold">Message
        <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 1000))} rows={4} className={`${field} py-2 leading-relaxed`} placeholder="Hi {name}, …" />
        <span className="mt-1 flex justify-between text-xs font-normal text-muted"><span>Write <b className="font-mono">{"{name}"}</b> to use each customer&apos;s first name.</span><span className="num">{body.length}/1000</span></span>
      </label>
      <label className="mt-3 block font-semibold">Opens
        <input value={link} onChange={(e) => setLink(e.target.value.trim())} className={`${field} h-10 font-mono`} placeholder="/c/notebooks" />
        <span className="mt-1 block text-xs font-normal text-muted">A page in the shop, like / or /c/notebooks or /search?q=pens</span>
      </label>

      <fieldset className="mt-4">
        <legend className="font-semibold">Who gets it</legend>
        <div className="mt-1.5 grid gap-1.5">
          {AUDIENCES.map((a) => (
            <label key={a.key} className={clsx("flex cursor-pointer items-start gap-2.5 rounded-[10px] p-2.5", audience === a.key ? "bg-nib-soft ring-1 ring-ink/40" : "bg-sunk hover:bg-ink-soft")}>
              <input type="radio" name="aud" checked={audience === a.key} onChange={() => setAudience(a.key)} className="mt-0.5 accent-[var(--ink)]" />
              <span className="min-w-0 flex-1"><span className="block font-semibold">{a.label}</span><span className="block text-xs text-muted">{a.hint}</span>
                {a.key === "inactive" && audience === "inactive" && (
                  <span className="mt-2 flex items-center gap-2 text-xs font-semibold">No order in the last
                    <input type="number" min={3} max={365} value={days} onChange={(e) => setDays(Math.max(3, Math.min(365, Number(e.target.value) || 30)))} className="h-8 w-16 rounded-[6px] border border-line bg-card px-2 text-center" aria-label="Days" /> days
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="font-semibold">Send by</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {CHANNELS.map(({ key, label, icon: Icon }) => {
            const on = channels.includes(key);
            const n = key === "inapp" ? counts?.total : key === "email" ? counts?.email : counts?.whatsapp;
            return (
              <button key={key} type="button" aria-pressed={on} onClick={() => setChannels((c) => (on ? c.filter((x) => x !== key) : [...c, key]))}
                className={clsx("press rounded-[10px] p-2.5 text-left", on ? "bg-ink text-on-ink" : "bg-sunk hover:bg-ink-soft")}>
                <Icon className="size-4" />
                <span className="mt-1 block text-xs font-bold">{label}</span>
                <span className={clsx("num block text-[11px]", on ? "text-on-ink/75" : "text-muted")}>{n == null ? "…" : `${n} ${n === 1 ? "person" : "people"}`}</span>
              </button>
            );
          })}
        </div>
        {channels.includes("email") && mailOff && <p className="mt-2 rounded-[8px] bg-nib-soft px-3 py-2 text-xs">Email key not added yet. Emails will wait in the queue and go out once you add it on the right.</p>}
        {channels.includes("whatsapp") && waOff && <p className="mt-2 rounded-[8px] bg-nib-soft px-3 py-2 text-xs">WhatsApp is switched off. Messages will wait until you connect the gateway on the right.</p>}
        <p className="mt-2 text-xs text-muted">Only people who said yes get email offers or WhatsApp messages; they can turn them off in Account.</p>
      </fieldset>

      {(title || body) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-[10px] bg-sunk p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">In the app</p>
            <div className="mt-1.5 rounded-[8px] bg-card p-2.5"><p className="font-bold">{title || "Title"}</p><p className="text-muted">{preview}</p></div>
          </div>
          <div className="rounded-[10px] bg-[#e7dfd4] p-3 dark:bg-[#1c2722]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0]">WhatsApp</p>
            <div className="mt-1.5 ml-auto max-w-[95%] whitespace-pre-line rounded-[8px] rounded-tr-none bg-[#d9fdd3] p-2.5 text-[13px] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]">
              <b>{title || "Title"}</b>{"\n"}{preview}{"\n\n"}<span className="text-[#027eb5] dark:text-[#53bdeb]">gupta-ink-g22y.vercel.app{link}</span>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {!confirm ? (
          <motion.button key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" disabled={!ok} onClick={() => setConfirm(true)}
            className="press mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-nib font-bold text-on-nib disabled:opacity-40">
            <Users className="size-4" /> Review and send
          </motion.button>
        ) : (
          <motion.div key="confirm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-[10px] bg-nib-soft p-3">
            <p className="font-semibold">Send now?</p>
            <p className="num mt-0.5 text-muted">{[reach.inapp && `${reach.inapp} in the app`, reach.email && `${reach.email} by email`, reach.whatsapp && `${reach.whatsapp} on WhatsApp`].filter(Boolean).join(" · ")}</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirm(false)} className="press h-10 rounded-[8px] bg-card font-semibold">Back</button>
              <button type="button" onClick={() => void send()} disabled={busy} className="press inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-ink font-bold text-on-ink disabled:opacity-50"><Send className="size-4" /> {busy ? "Sending…" : "Send"}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {msg && <p role="status" className={clsx("mt-3 rounded-[8px] px-3 py-2", msg.ok ? "bg-ok/10 text-ok" : "bg-margin/10 text-margin")}>{msg.text}</p>}
    </section>
  );
}
