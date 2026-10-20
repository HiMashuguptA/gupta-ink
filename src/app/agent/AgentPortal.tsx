"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Phone, Navigation, MapPin, Package, Banknote, CheckCircle2, LocateFixed, LocateOff, Store, ChevronDown } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";
import { STATUS_LABEL, when, type OrderRow } from "@/lib/orders";
import { Logo } from "@/components/brand/Logo";

export type Job = Pick<OrderRow, "id" | "order_no" | "status" | "type" | "slot_date" | "slot_start" | "slot_end" | "address" | "road_km" | "payable_paise" | "payment_method" | "payment_status" | "note" | "created_at"> & {
  otp_attempts: number;
  order_items: { name: string; variant_label: string | null; qty: number }[];
};
type Done = { id: string; order_no: string; payable_paise: number; payment_method: string; delivered_at: string };
type Geo = "off" | "asking" | "on" | "denied" | "error" | "unsupported";

export function AgentPortal({ agentId, name, isAgent, initialOnline, initialJobs, doneToday, storePhone }: {
  agentId: string; name: string; isAgent: boolean; initialOnline: boolean; initialJobs: Job[]; doneToday: Done[];
  storePhone: string; shop: { lat: number; lng: number };
}) {
  const router = useRouter();
  const sb = supabaseBrowser();
  const [online, setOnline] = useState(initialOnline);
  const [geo, setGeo] = useState<Geo>("off");
  // New requests first, then the order they were placed in
  const jobs = useMemo(() => [...initialJobs].sort((a, b) => Number(b.status === "agent_assigned") - Number(a.status === "agent_assigned")), [initialJobs]);
  const seen = useRef(new Set(initialJobs.map((j) => j.id)));

  // New jobs and changes from the store appear without reloading
  useEffect(() => {
    const ch = sb.channel(`agent-${agentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `agent_id=eq.${agentId}` }, () => router.refresh())
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [sb, agentId, router]);

  useEffect(() => {
    const fresh = jobs.filter((j) => !seen.current.has(j.id));
    if (fresh.length) {
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ }
      fresh.forEach((j) => seen.current.add(j.id));
    }
  }, [jobs]);

  // Share live location while carrying an order
  const active = useMemo(() => jobs.filter((j) => j.status === "agent_accepted" || j.status === "out_for_delivery").map((j) => j.id), [jobs]);
  const activeRef = useRef(active);
  activeRef.current = active;
  const activeKey = active.join(",");
  useEffect(() => {
    if (!isAgent || !activeKey) { setGeo("off"); return; }
    if (!("geolocation" in navigator)) { setGeo("unsupported"); return; }
    setGeo("asking");
    let last = 0;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => { /* screen may still sleep */ });
    const id = navigator.geolocation.watchPosition(
      async (p) => {
        setGeo("on");
        if (Date.now() - last < 10_000) return;
        last = Date.now();
        const rows = activeRef.current.map((order_id) => ({
          order_id, agent_id: agentId, lat: p.coords.latitude, lng: p.coords.longitude,
          heading: Number.isFinite(p.coords.heading) ? p.coords.heading : null, updated_at: new Date().toISOString(),
        }));
        const { error } = await sb.from("agent_locations").upsert(rows);
        if (error) setGeo("error");
      },
      (e) => setGeo(e.code === e.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => { navigator.geolocation.clearWatch(id); void lock?.release().catch(() => {}); };
  }, [isAgent, activeKey, agentId, sb]);

  const toggleOnline = async () => {
    const next = !online;
    setOnline(next);
    const { error } = await sb.rpc("agent_set_online", { p_online: next });
    if (error) setOnline(!next);
  };

  const cash = doneToday.filter((d) => d.payment_method === "cod").reduce((a, d) => a + d.payable_paise, 0);

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-paper px-4 pb-10 pt-4">
      <header className="flex items-center gap-3">
        <Logo size={30} />
        <div className="ml-auto flex items-center gap-2">
          <a href={`tel:+91${storePhone}`} className="grid size-10 place-items-center rounded-full border border-line bg-card" aria-label="Call the store"><Store className="size-4" /></a>
          {isAgent && (
            <button onClick={toggleOnline} role="switch" aria-checked={online}
              className={clsx("inline-flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-sm font-bold transition-colors", online ? "bg-ok text-white" : "border border-line bg-card text-muted")}>
              <span className={clsx("size-7 rounded-full transition-colors", online ? "bg-white/30" : "bg-line")} />
              {online ? "Online" : "Offline"}
            </button>
          )}
        </div>
      </header>

      <h1 className="mt-5 text-2xl font-extrabold">Hi {name}</h1>
      <p className="text-sm text-muted">{jobs.length ? `${jobs.length} ${jobs.length === 1 ? "delivery" : "deliveries"} with you` : online ? "No deliveries right now. New ones appear here." : "Go online so the store knows you're free."}</p>

      {!isAgent && <p className="mt-3 rounded-xl bg-nib-soft p-3 text-sm">You&apos;re signed in as admin. Only delivery partners can act on deliveries here.</p>}

      {geo !== "off" && (
        <p className={clsx("mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
          geo === "on" ? "bg-ok/10 text-ok" : geo === "asking" ? "bg-ink-soft text-ink" : "bg-margin/10 text-margin")} role="status">
          {geo === "on" || geo === "asking" ? <LocateFixed className="size-4" /> : <LocateOff className="size-4" />}
          {geo === "on" ? "Sharing your live location with the customer" : geo === "asking" ? "Finding your location..." :
            geo === "denied" ? "Location is blocked. Allow it for this site in Chrome settings." :
            geo === "unsupported" ? "This browser can't share location." : "Couldn't update your location. Check GPS and data."}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {jobs.map((j) => <JobCard key={j.id} job={j} canAct={isAgent} onChanged={() => router.refresh()} />)}
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-end justify-between">
          <div><p className="text-sm text-muted">Delivered today</p><p className="font-display text-3xl font-extrabold">{doneToday.length}</p></div>
          {cash > 0 && <div className="text-right"><p className="text-sm text-muted">Cash to hand in</p><p className="font-display text-2xl font-extrabold">{rupees(cash)}</p></div>}
        </div>
        {doneToday.length > 0 && (
          <ul className="mt-3 divide-y divide-line text-sm">
            {doneToday.map((d) => (
              <li key={d.id} className="flex justify-between py-2">
                <span className="font-semibold">{d.order_no} <span className="font-normal text-muted">{new Date(d.delivered_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}</span></span>
                <span>{d.payment_method === "cod" ? `${rupees(d.payable_paise)} cash` : "Paid online"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link href="/" className="mt-6 inline-block text-sm font-semibold text-ink">Open the shop</Link>
    </main>
  );
}

function JobCard({ job, canAct, onChanged }: { job: Job; canAct: boolean; onChanged: () => void }) {
  const sb = supabaseBrowser();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [code, setCode] = useState("");
  const [cash, setCash] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const a = job.address;
  const collect = job.payment_method === "cod" && job.payment_status !== "paid";
  const units = job.order_items.reduce((n, i) => n + i.qty, 0);
  const locked = job.otp_attempts >= 5;

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>, ok?: string) => {
    setBusy(true); setMsg(null);
    const { error, data } = await fn();
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return null; }
    if (ok) setMsg({ ok: true, text: ok });
    return data ?? true;
  };

  const accept = async () => { if (await run(() => sb.rpc("agent_accept", { p_order: job.id }))) onChanged(); };
  const handBack = async () => {
    const reason = window.prompt("Why are you handing this back? The store will see it.", "");
    if (reason === null) return;
    if (await run(() => sb.rpc("agent_decline", { p_order: job.id, p_reason: reason }))) onChanged();
  };
  const start = async () => { if (await run(() => sb.rpc("agent_start_delivery", { p_order: job.id }))) onChanged(); };
  const resend = async () => {
    const sent = await run(() => sb.rpc("agent_resend_code", { p_order: job.id }));
    if (sent !== null) setMsg({ ok: true, text: sent === false ? "Email isn't set up yet. The customer can see the code in their app." : "Code sent again. The customer can also see it in their app." });
  };
  const issue = async () => {
    const note = window.prompt("What's the problem? (customer not answering, wrong address...)", "");
    if (!note) return;
    await run(() => sb.rpc("agent_report_issue", { p_order: job.id, p_note: note }), "The store has been told. They'll call you.");
  };
  const deliver = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await run(() => sb.rpc("agent_complete", { p_order: job.id, p_code: code, p_cash_collected: cash })) as { ok: boolean; tries_left?: number } | null;
    if (!res) return;
    if (!res.ok) { setCode(""); setMsg({ ok: false, text: res.tries_left ? `Wrong code. ${res.tries_left} ${res.tries_left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Call the store." }); onChanged(); return; }
    setMsg({ ok: true, text: "Delivered. Nice work!" });
    setTimeout(onChanged, 900);
  };

  return (
    <article className={clsx("overflow-hidden rounded-2xl border bg-card", job.status === "agent_assigned" ? "border-nib shadow-[0_0_0_3px_rgba(233,162,59,.25)]" : "border-line")}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <p className="font-display text-lg font-extrabold">{job.order_no}</p>
        <span className="rounded-full bg-ink-soft px-2.5 py-0.5 text-xs font-bold text-ink">{job.status === "agent_assigned" ? "New" : STATUS_LABEL[job.status]}</span>
        <span className="ml-auto text-xs text-muted">{when(job)}</span>
      </div>

      <div className="space-y-3 p-4 text-sm">
        <div className={clsx("flex items-center gap-2 rounded-xl px-3 py-2 font-bold", collect ? "bg-nib-soft text-ink-deep" : "bg-ok/10 text-ok")}>
          {collect ? <Banknote className="size-5" /> : <CheckCircle2 className="size-5" />}
          {collect ? `Collect ${rupees(job.payable_paise)} in cash` : "Paid online. Collect nothing."}
        </div>

        {a && (
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-ink" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.contact_name}</p>
              <p className="text-muted">{a.house_name}, {a.road}{a.landmark ? `, near ${a.landmark}` : ""}</p>
              {job.road_km != null && <p className="text-xs text-muted">{Number(job.road_km).toFixed(1)} km from the store</p>}
            </div>
          </div>
        )}
        {a && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:+91${a.contact_phone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line font-semibold"><Phone className="size-4" /> Call</a>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}&travelmode=two-wheeler`} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line font-semibold"><Navigation className="size-4" /> Navigate</a>
          </div>
        )}

        <button onClick={() => setShowItems((v) => !v)} className="flex w-full items-center gap-2 text-left font-semibold" aria-expanded={showItems}>
          <Package className="size-4 text-ink" /> {units} {units === 1 ? "item" : "items"} in the bag
          <ChevronDown className={clsx("ml-auto size-4 transition-transform", showItems && "rotate-180")} />
        </button>
        {showItems && (
          <ul className="space-y-1 rounded-xl bg-paper p-3">
            {job.order_items.map((i, k) => <li key={k} className="flex justify-between"><span>{i.name}{i.variant_label ? ` (${i.variant_label})` : ""}</span><b>× {i.qty}</b></li>)}
          </ul>
        )}
        {job.note && <p className="rounded-xl border border-nib/40 bg-nib-soft px-3 py-2"><b>Note:</b> {job.note}</p>}

        {canAct && job.status === "agent_assigned" && (
          <div className="grid grid-cols-[1fr_auto] gap-2 pt-1">
            <button disabled={busy} onClick={accept} className="h-12 rounded-xl bg-ink text-base font-bold text-white disabled:opacity-50">Accept delivery</button>
            <button disabled={busy} onClick={handBack} className="h-12 rounded-xl border border-line px-4 font-semibold disabled:opacity-50">Decline</button>
          </div>
        )}
        {canAct && job.status === "agent_accepted" && (
          <div className="space-y-2 pt-1">
            <button disabled={busy} onClick={start} className="h-12 w-full rounded-xl bg-ink text-base font-bold text-white disabled:opacity-50">Picked up, start delivery</button>
            <button disabled={busy} onClick={handBack} className="h-10 w-full rounded-xl font-semibold text-muted disabled:opacity-50">Hand back to the store</button>
          </div>
        )}
        {canAct && job.status === "out_for_delivery" && (
          <form onSubmit={deliver} className="space-y-2 border-t border-dashed border-line pt-3">
            <label htmlFor={`code-${job.id}`} className="block font-semibold">Ask the customer for the 4-digit delivery code</label>
            <input id={`code-${job.id}`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric" autoComplete="one-time-code" placeholder="• • • •" disabled={locked || busy}
              className="h-14 w-full rounded-xl border-[1.5px] border-line bg-paper text-center font-display text-3xl font-extrabold tracking-[0.5em] outline-none focus:border-ink disabled:opacity-50" />
            {collect && (
              <label className="flex items-center gap-3 rounded-xl bg-nib-soft px-3 py-3 font-semibold">
                <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} className="size-5 accent-[var(--ink)]" />
                I collected {rupees(job.payable_paise)} in cash
              </label>
            )}
            <button disabled={busy || locked || code.length !== 4 || (collect && !cash)} className="h-12 w-full rounded-xl bg-ok text-base font-bold text-white disabled:opacity-40">Mark delivered</button>
            <div className="flex justify-between">
              <button type="button" disabled={busy} onClick={resend} className="text-sm font-semibold text-ink">Customer didn&apos;t get it?</button>
              <button type="button" disabled={busy} onClick={issue} className="text-sm font-semibold text-margin">Report a problem</button>
            </div>
          </form>
        )}
        {msg && <p className={clsx("text-sm font-semibold", msg.ok ? "text-ok" : "text-margin")} role="status">{msg.text}</p>}
      </div>
    </article>
  );
}
