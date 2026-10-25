"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CheckCircle2, ChevronDown, CircleAlert, KeyRound, Mail, MessageCircle, Send } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Tally = { queued: number; sent_today: number; failed_today: number };
export type MsgStatus = {
  brevo_key: boolean; openwa_key: boolean; sender: string;
  settings: { wa_enabled: boolean; wa_base_url: string | null; wa_session: string; wa_per_minute: number; wa_daily_cap: number; email_per_minute: number; email_daily_cap: number; order_updates_wa: boolean };
  email: Tally; whatsapp: Tally; last_error: { channel: string; error: string; at: string } | null;
};

function Pill({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", ok ? "bg-ok/12 text-ok" : "bg-nib-soft text-graphite")}>
      {ok ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />} {ok ? yes : no}
    </span>
  );
}

function Stats({ t, cap }: { t: Tally; cap: number }) {
  return (
    <dl className="num mt-3 grid grid-cols-3 gap-1.5 text-center">
      <div className="rounded-[8px] bg-sunk p-2"><dt className="text-[11px] text-muted">Waiting</dt><dd className="text-base font-bold">{t.queued}</dd></div>
      <div className="rounded-[8px] bg-sunk p-2"><dt className="text-[11px] text-muted">Sent today</dt><dd className="text-base font-bold">{t.sent_today}<span className="text-xs font-normal text-muted">/{cap}</span></dd></div>
      <div className="rounded-[8px] bg-sunk p-2"><dt className="text-[11px] text-muted">Failed today</dt><dd className={clsx("text-base font-bold", t.failed_today > 0 && "text-margin")}>{t.failed_today}</dd></div>
    </dl>
  );
}

export function ChannelSetup({ initial, error }: { initial: MsgStatus | null; error: string | null }) {
  const router = useRouter();
  const sb = supabaseBrowser();
  const [st, setSt] = useState(initial?.settings);
  const [brevo, setBrevo] = useState("");
  const [owa, setOwa] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; where: "email" | "wa" } | null>(null);
  const [help, setHelp] = useState(false);

  if (!initial || !st) return <section className="rounded-[14px] bg-card p-4 text-sm text-margin">Couldn&apos;t load messaging settings. {error}</section>;

  const field = "mt-1 h-10 w-full rounded-[8px] border border-line bg-paper px-3 text-sm text-graphite caret-ink outline-none focus:border-ink";

  const saveKey = async (name: "brevo_api_key" | "openwa_api_key", value: string, where: "email" | "wa") => {
    setBusy(name); setMsg(null);
    const { error } = await sb.rpc("admin_set_secret", { p_name: name, p_value: value });
    setBusy(null);
    if (error) return setMsg({ ok: false, text: error.message, where });
    if (name === "brevo_api_key") setBrevo(""); else setOwa("");
    setMsg({ ok: true, text: "Key saved. It's stored encrypted and can't be read back from here.", where });
    router.refresh();
  };

  const test = async (ch: "email" | "whatsapp") => {
    const where = ch === "email" ? "email" : "wa";
    setBusy(`test-${ch}`); setMsg(null);
    const { error } = await sb.rpc("admin_test_message", { p_channel: ch });
    setBusy(null);
    setMsg(error ? { ok: false, text: error.message, where } : { ok: true, text: ch === "email" ? "Test email queued to you. It goes out within a minute." : "Test WhatsApp queued to your number. It goes out within a minute.", where });
    router.refresh();
  };

  const saveWa = async () => {
    setMsg(null);
    const url = (st.wa_base_url ?? "").trim().replace(/\/+$/, "");
    if (st.wa_enabled && !/^https:\/\/[^\s/]+(\/\S*)?$/.test(url)) return setMsg({ ok: false, text: "Gateway address must start with https://", where: "wa" });
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(st.wa_session)) return setMsg({ ok: false, text: "Session name: letters, numbers, - or _ only", where: "wa" });
    setBusy("wa");
    const { error } = await sb.from("messaging_settings").update({
      wa_enabled: st.wa_enabled, wa_base_url: url || null, wa_session: st.wa_session, wa_per_minute: st.wa_per_minute,
      wa_daily_cap: st.wa_daily_cap, order_updates_wa: st.order_updates_wa, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setBusy(null);
    if (error) return setMsg({ ok: false, text: error.message, where: "wa" });
    setMsg({ ok: true, text: "Saved.", where: "wa" });
    router.refresh();
  };

  const note = (where: "email" | "wa") => msg && msg.where === where && (
    <p role="status" className={clsx("mt-2 rounded-[8px] px-3 py-2 text-xs", msg.ok ? "bg-ok/10 text-ok" : "bg-margin/10 text-margin")}>{msg.text}</p>
  );

  return (
    <div className="grid content-start gap-4 text-sm">
      {/* Email */}
      <section className="rounded-[14px] bg-card p-4">
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-ink" /><h2 className="text-[20px] uppercase">Email</h2>
          <span className="ml-auto"><Pill ok={initial.brevo_key} yes="Ready" no="Key needed" /></span>
        </div>
        <p className="mt-1 text-muted">Sent with Brevo (free: 300 a day). Delivery codes, offers and tests use this.</p>
        <p className="mt-2 text-xs">From <b className="font-mono">{initial.sender}</b>. This address must be a verified sender in Brevo (Senders, domains and IPs).</p>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (brevo.trim()) void saveKey("brevo_api_key", brevo, "email"); }}>
          <label className="min-w-0 flex-1 font-semibold"><span className="sr-only">Brevo API key</span>
            <input type="password" value={brevo} onChange={(e) => setBrevo(e.target.value)} autoComplete="off" spellCheck={false} placeholder={initial.brevo_key ? "Replace the saved key" : "Paste your Brevo API key (xkeysib-…)"} className={`${field} mt-0 font-mono`} />
          </label>
          <button disabled={!brevo.trim() || busy === "brevo_api_key"} className="press inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-ink px-3 font-semibold text-on-ink disabled:opacity-40"><KeyRound className="size-4" /> Save</button>
        </form>
        <button type="button" onClick={() => void test("email")} disabled={!initial.brevo_key || !!busy} className="press mt-2 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-sunk px-3 text-xs font-semibold hover:bg-ink-soft disabled:opacity-40"><Send className="size-3.5" /> Send me a test email</button>
        {note("email")}
        <Stats t={initial.email} cap={st.email_daily_cap} />
      </section>

      {/* WhatsApp */}
      <section className="rounded-[14px] bg-card p-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-5 text-ink" /><h2 className="text-[20px] uppercase">WhatsApp</h2>
          <span className="ml-auto"><Pill ok={st.wa_enabled && initial.openwa_key && !!initial.settings.wa_base_url} yes="On" no={st.wa_enabled ? "Needs setup" : "Off"} /></span>
        </div>
        <p className="mt-1 text-muted">Through your own free OpenWA gateway, linked to the shop&apos;s WhatsApp number. Order updates go to customers who turned WhatsApp on.</p>

        <label className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-sunk p-3 font-semibold">
          Send WhatsApp messages
          <input type="checkbox" role="switch" checked={st.wa_enabled} onChange={(e) => setSt({ ...st, wa_enabled: e.target.checked })} className="size-5 accent-[var(--ink)]" />
        </label>
        <label className="mt-3 block font-semibold">Gateway address
          <input value={st.wa_base_url ?? ""} onChange={(e) => setSt({ ...st, wa_base_url: e.target.value })} placeholder="https://wa.yourshop.in" className={`${field} font-mono`} spellCheck={false} />
        </label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="font-semibold">Session<input value={st.wa_session} onChange={(e) => setSt({ ...st, wa_session: e.target.value.trim() })} className={`${field} font-mono`} /></label>
          <label className="font-semibold">Per minute<input type="number" min={1} max={30} value={st.wa_per_minute} onChange={(e) => setSt({ ...st, wa_per_minute: Math.max(1, Math.min(30, Number(e.target.value) || 6)) })} className={field} /></label>
          <label className="font-semibold">Per day<input type="number" min={1} max={1000} value={st.wa_daily_cap} onChange={(e) => setSt({ ...st, wa_daily_cap: Math.max(1, Math.min(1000, Number(e.target.value) || 200)) })} className={field} /></label>
        </div>
        <label className="mt-3 flex items-center justify-between gap-3 font-semibold">
          Order and return updates on WhatsApp
          <input type="checkbox" checked={st.order_updates_wa} onChange={(e) => setSt({ ...st, order_updates_wa: e.target.checked })} className="size-5 accent-[var(--ink)]" />
        </label>
        <button type="button" onClick={() => void saveWa()} disabled={busy === "wa"} className="press mt-3 h-10 w-full rounded-[8px] bg-ink font-semibold text-on-ink disabled:opacity-50">{busy === "wa" ? "Saving…" : "Save WhatsApp settings"}</button>

        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (owa.trim()) void saveKey("openwa_api_key", owa, "wa"); }}>
          <label className="min-w-0 flex-1"><span className="sr-only">OpenWA API key</span>
            <input type="password" value={owa} onChange={(e) => setOwa(e.target.value)} autoComplete="off" spellCheck={false} placeholder={initial.openwa_key ? "Replace the saved gateway key" : "Gateway API key"} className={`${field} mt-0 font-mono`} />
          </label>
          <button disabled={!owa.trim() || busy === "openwa_api_key"} className="press inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-sunk px-3 font-semibold hover:bg-ink-soft disabled:opacity-40"><KeyRound className="size-4" /> Save key</button>
        </form>
        <button type="button" onClick={() => void test("whatsapp")} disabled={!initial.openwa_key || !initial.settings.wa_enabled || !!busy} className="press mt-2 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-sunk px-3 text-xs font-semibold hover:bg-ink-soft disabled:opacity-40"><Send className="size-3.5" /> Send me a test WhatsApp</button>
        {note("wa")}
        <Stats t={initial.whatsapp} cap={st.wa_daily_cap} />

        <button type="button" onClick={() => setHelp((h) => !h)} aria-expanded={help} className="mt-3 flex w-full items-center justify-between rounded-[8px] px-1 py-1.5 text-left font-semibold text-ink">
          How to set up the free gateway <ChevronDown className={clsx("size-4 transition-transform duration-200", help && "rotate-180")} />
        </button>
        {help && (
          <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-graphite">
            <li>On the shop computer (or any always-on PC), install Docker Desktop and Git, then run: <code className="rounded bg-sunk px-1 font-mono break-all">git clone https://github.com/rmyndharis/OpenWA.git</code>, <code className="rounded bg-sunk px-1 font-mono break-all">cd OpenWA</code>, <code className="rounded bg-sunk px-1 font-mono break-all">docker compose -f docker-compose.dev.yml up -d</code>.</li>
            <li>Get the admin API key with <code className="rounded bg-sunk px-1 font-mono break-all">docker exec openwa-api cat /app/data/.api-key</code>. Open <code className="rounded bg-sunk px-1 font-mono break-all">http://localhost:2785</code>, create a session, scan its QR code with the shop&apos;s WhatsApp (Settings, Linked devices), and copy the session&apos;s ID into Session here.</li>
            <li>Give it a public https address with a free Cloudflare Tunnel: <code className="rounded bg-sunk px-1 font-mono break-all">cloudflared tunnel --url http://localhost:2785</code>, or a named tunnel for a fixed address.</li>
            <li>Paste that address and the API key here, switch WhatsApp on, save, and send yourself a test.</li>
            <li>Keep it slow (6 a minute is safe) and only message people who opted in. OpenWA uses WhatsApp Web, which WhatsApp doesn&apos;t officially support, so a number that spams can be banned.</li>
          </ol>
        )}
      </section>

      {initial.last_error && (
        <p className="rounded-[10px] bg-margin/8 px-3 py-2 text-xs text-margin">Last problem ({initial.last_error.channel}): {initial.last_error.error}</p>
      )}
    </div>
  );
}
