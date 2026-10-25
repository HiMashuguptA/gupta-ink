"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, Pencil, Megaphone } from "lucide-react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";
import { Sheet } from "@/components/ui/Sheet";

export type Coupon = {
  code: string; title: string; description: string | null; type: "percent" | "flat" | "free_delivery"; value: number;
  max_discount_paise: number | null; min_order_paise: number; valid_from: string; valid_to: string | null;
  total_limit: number | null; per_user_limit: number; used_count: number; audience: "all" | "selected"; audience_user_ids: string[];
  first_order_only: boolean; category_ids: string[]; active: boolean;
};

type Form = {
  code: string; title: string; description: string; type: Coupon["type"]; value: string; maxOff: string; minOrder: string;
  from: string; to: string; totalLimit: string; perUser: string; firstOnly: boolean; categories: string[];
  audience: "all" | "selected"; emails: string; active: boolean; existing: boolean;
};

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);
const blank = (): Form => ({ code: "", title: "", description: "", type: "percent", value: "10", maxOff: "100", minOrder: "199", from: toLocal(new Date().toISOString()),
  to: "", totalLimit: "", perUser: "1", firstOnly: false, categories: [], audience: "all", emails: "", active: true, existing: false });

function describe(c: Coupon) {
  if (c.type === "free_delivery") return "Free delivery";
  if (c.type === "flat") return `${rupees(c.value)} off`;
  return `${c.value}% off${c.max_discount_paise ? `, up to ${rupees(c.max_discount_paise)}` : ""}`;
}

export function CouponManager({ initial, categories }: { initial: Coupon[]; categories: { id: string; name: string }[] }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [justMade, setJustMade] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const edit = async (c: Coupon) => {
    let emails = "";
    if (c.audience === "selected" && c.audience_user_ids.length) {
      const { data } = await sb.from("profiles").select("email").in("id", c.audience_user_ids);
      emails = (data ?? []).map((p) => p.email).join("\n");
    }
    setErr(null);
    setForm({ code: c.code, title: c.title, description: c.description ?? "", type: c.type,
      value: c.type === "flat" ? String(c.value / 100) : String(c.value), maxOff: c.max_discount_paise ? String(c.max_discount_paise / 100) : "",
      minOrder: String(c.min_order_paise / 100), from: toLocal(c.valid_from), to: toLocal(c.valid_to), totalLimit: c.total_limit?.toString() ?? "",
      perUser: String(c.per_user_limit), firstOnly: c.first_order_only, categories: c.category_ids, audience: c.audience, emails, active: c.active, existing: true });
  };

  const toggle = async (c: Coupon) => {
    await sb.from("coupons").update({ active: !c.active }).eq("code", c.code);
    router.refresh();
  };

  const save = async () => {
    if (!form) return;
    setErr(null);
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return setErr("Code: 3 to 20 letters or numbers, no spaces");
    if (!form.title.trim()) return setErr("Add a short title customers will see");
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const value = form.type === "free_delivery" ? 0 : form.type === "flat" ? Math.round((num(form.value) ?? 0) * 100) : Math.round(num(form.value) ?? 0);
    if (form.type === "percent" && (value < 1 || value > 100)) return setErr("Percent must be 1 to 100");
    if (form.type === "flat" && value < 100) return setErr("Flat discount must be at least ₹1");
    let ids: string[] = [];
    if (form.audience === "selected") {
      const emails = form.emails.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
      if (!emails.length) return setErr("Add at least one customer email");
      const { data } = await sb.from("profiles").select("id, email").in("email", emails);
      const found = new Set((data ?? []).map((p) => (p.email ?? "").toLowerCase()));
      const missing = emails.filter((e) => !found.has(e));
      if (missing.length) return setErr(`No account for: ${missing.join(", ")}`);
      ids = (data ?? []).map((p) => p.id);
    }
    const row = {
      code, title: form.title.trim(), description: form.description.trim() || null, type: form.type, value,
      max_discount_paise: form.type === "percent" && num(form.maxOff) ? Math.round(num(form.maxOff)! * 100) : null,
      min_order_paise: Math.round((num(form.minOrder) ?? 0) * 100),
      valid_from: fromLocal(form.from) ?? new Date().toISOString(), valid_to: fromLocal(form.to),
      total_limit: num(form.totalLimit), per_user_limit: Math.max(1, num(form.perUser) ?? 1),
      first_order_only: form.firstOnly, category_ids: form.categories, audience: form.audience, audience_user_ids: ids, active: form.active,
    };
    setBusy(true);
    const { error } = form.existing ? await sb.from("coupons").update(row).eq("code", code) : await sb.from("coupons").insert(row);
    setBusy(false);
    if (error) return setErr(error.code === "23505" ? "That code already exists" : error.message);
    if (!form.existing && form.active) setJustMade(code);
    setForm(null);
    router.refresh();
  };

  const field = "mt-1 h-10 w-full rounded-[8px] border border-line bg-paper px-3 outline-none focus:border-ink";
  return (
    <>
      {justMade && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[12px] bg-nib-soft p-3 text-sm" role="status">
          <Megaphone className="size-5 text-ink" />
          <p className="flex-1"><b className="font-mono">{justMade}</b> is live. Tell your customers about it?</p>
          <Link href={`/admin/messages?coupon=${justMade}`} className="press inline-flex h-9 items-center rounded-[8px] bg-ink px-3 font-semibold text-on-ink">Announce it</Link>
          <button onClick={() => setJustMade(null)} className="h-9 rounded-[8px] px-2 font-semibold text-muted hover:bg-card">Not now</button>
        </div>
      )}
      <button onClick={() => { setErr(null); setForm(blank()); }} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-semibold text-on-ink"><Plus className="size-4" /> New coupon</button>

      <ul className="mt-4 grid gap-2.5 md:hidden">
        {initial.map((c) => {
          const expired = c.valid_to && new Date(c.valid_to) < new Date();
          return (
            <li key={c.code} className="rounded-[12px] bg-card p-3.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="rounded-md border border-dashed border-ink px-2 py-0.5 font-mono font-bold text-ink">{c.code}</span>
                  <p className="mt-1.5 font-semibold">{describe(c)}</p>
                  <p className="text-xs text-muted">
                    {[c.min_order_paise > 0 && `Min ${rupees(c.min_order_paise)}`, c.first_order_only && "First order only",
                      c.audience === "selected" && `${c.audience_user_ids.length} chosen customers`, c.category_ids.length > 0 && `${c.category_ids.length} categories`,
                      c.valid_to && `${expired ? "Ended" : "Ends"} ${new Date(c.valid_to).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}`,
                      `Used ${c.used_count}${c.total_limit ? ` / ${c.total_limit}` : ""}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button role="switch" aria-checked={c.active} onClick={() => toggle(c)} aria-label={`${c.code} ${c.active ? "on" : "off"}`}
                    className={clsx("relative h-6 w-11 rounded-full transition-colors", c.active && !expired ? "bg-ok" : "bg-line")}>
                    <span className={clsx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", c.active ? "left-[22px]" : "left-0.5")} />
                  </button>
                  {c.active && <Link href={`/admin/messages?coupon=${c.code}`} className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label={`Announce ${c.code} to customers`} title="Announce to customers"><Megaphone className="size-4" /></Link>}
                  <button onClick={() => edit(c)} className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label={`Edit ${c.code}`}><Pencil className="size-4" /></button>
                </div>
              </div>
            </li>
          );
        })}
        {!initial.length && <li className="rounded-[12px] bg-card p-6 text-center text-sm text-muted">No coupons yet.</li>}
      </ul>
      <div className="mt-4 hidden overflow-x-auto rounded-[12px] bg-card md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-muted">
            <th className="p-3 font-semibold">Code</th><th className="p-3 font-semibold">Offer</th><th className="p-3 font-semibold">Rules</th>
            <th className="p-3 font-semibold">Used</th><th className="p-3 font-semibold">Live</th><th className="p-3" />
          </tr></thead>
          <tbody>
            {initial.map((c) => {
              const expired = c.valid_to && new Date(c.valid_to) < new Date();
              return (
                <tr key={c.code} className="border-t border-line">
                  <td className="p-3"><span className="rounded-md border border-dashed border-ink px-2 py-0.5 font-mono font-bold text-ink">{c.code}</span><span className="mt-1 block text-xs text-muted">{c.title}</span></td>
                  <td className="p-3 font-semibold">{describe(c)}</td>
                  <td className="p-3 text-xs text-muted">
                    {c.min_order_paise > 0 && <span className="block">Min {rupees(c.min_order_paise)}</span>}
                    {c.first_order_only && <span className="block">First order only</span>}
                    {c.audience === "selected" && <span className="block">{c.audience_user_ids.length} chosen customers</span>}
                    {c.category_ids.length > 0 && <span className="block">{c.category_ids.length} categories</span>}
                    {c.valid_to && <span className="block">{expired ? "Ended" : "Ends"} {new Date(c.valid_to).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}</span>}
                  </td>
                  <td className="p-3">{c.used_count}{c.total_limit ? ` / ${c.total_limit}` : ""}</td>
                  <td className="p-3">
                    <button role="switch" aria-checked={c.active} onClick={() => toggle(c)} aria-label={`${c.code} ${c.active ? "on" : "off"}`}
                      className={clsx("relative h-6 w-11 rounded-full transition-colors", c.active && !expired ? "bg-ok" : "bg-line")}>
                      <span className={clsx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", c.active ? "left-[22px]" : "left-0.5")} />
                    </button>
                  </td>
                  <td className="p-3 text-right"><span className="inline-flex">{c.active && <Link href={`/admin/messages?coupon=${c.code}`} className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label={`Announce ${c.code} to customers`} title="Announce to customers"><Megaphone className="size-4" /></Link>}<button onClick={() => edit(c)} className="grid size-9 place-items-center rounded-full hover:bg-ink-soft" aria-label={`Edit ${c.code}`}><Pencil className="size-4" /></button></span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!initial.length && <p className="p-6 text-center text-sm text-muted">No coupons yet.</p>}
      </div>

      <Sheet open={!!form} onClose={() => setForm(null)} title={form?.existing ? `Edit ${form.code}` : "New coupon"} wide>
        {form && (
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold">Code<input value={form.code} disabled={form.existing} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} className={`${field} font-mono uppercase`} placeholder="DIWALI20" /></label>
              <label className="font-semibold">Type
                <select value={form.type} onChange={(e) => set("type", e.target.value as Form["type"])} className={field}>
                  <option value="percent">Percent off</option><option value="flat">Flat ₹ off</option><option value="free_delivery">Free delivery</option>
                </select>
              </label>
            </div>
            <label className="font-semibold">Title customers see<input value={form.title} onChange={(e) => set("title", e.target.value)} className={field} placeholder="20% off for Diwali" /></label>
            <label className="font-semibold">Small print (optional)<input value={form.description} onChange={(e) => set("description", e.target.value)} className={field} placeholder="On orders of ₹299 or more" /></label>
            <div className="grid grid-cols-3 gap-3">
              {form.type !== "free_delivery" && <label className="font-semibold">{form.type === "percent" ? "Percent" : "₹ off"}<input inputMode="numeric" value={form.value} onChange={(e) => set("value", e.target.value.replace(/[^\d.]/g, ""))} className={field} /></label>}
              {form.type === "percent" && <label className="font-semibold">Max ₹ off<input inputMode="numeric" value={form.maxOff} onChange={(e) => set("maxOff", e.target.value.replace(/[^\d.]/g, ""))} className={field} placeholder="No cap" /></label>}
              <label className="font-semibold">Min order ₹<input inputMode="numeric" value={form.minOrder} onChange={(e) => set("minOrder", e.target.value.replace(/[^\d.]/g, ""))} className={field} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold">Starts<input type="datetime-local" value={form.from} onChange={(e) => set("from", e.target.value)} className={field} /></label>
              <label className="font-semibold">Ends (optional)<input type="datetime-local" value={form.to} onChange={(e) => set("to", e.target.value)} className={field} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-semibold">Total uses (optional)<input inputMode="numeric" value={form.totalLimit} onChange={(e) => set("totalLimit", e.target.value.replace(/\D/g, ""))} className={field} placeholder="Unlimited" /></label>
              <label className="font-semibold">Uses per customer<input inputMode="numeric" value={form.perUser} onChange={(e) => set("perUser", e.target.value.replace(/\D/g, ""))} className={field} /></label>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.firstOnly} onChange={(e) => set("firstOnly", e.target.checked)} className="size-4 accent-[var(--ink)]" /> First order only</label>
            <fieldset>
              <legend className="font-semibold">Only for these categories (none = everything)</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {categories.map((c) => {
                  const on = form.categories.includes(c.id);
                  return <button key={c.id} type="button" aria-pressed={on} onClick={() => set("categories", on ? form.categories.filter((x) => x !== c.id) : [...form.categories, c.id])}
                    className={clsx("rounded-full border px-2.5 py-1 text-xs", on ? "border-ink bg-ink text-on-ink" : "border-line")}>{c.name}</button>;
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="font-semibold">Who can use it</legend>
              <div className="mt-1.5 flex gap-2">
                {(["all", "selected"] as const).map((a) => (
                  <button key={a} type="button" aria-pressed={form.audience === a} onClick={() => set("audience", a)}
                    className={clsx("rounded-full border px-3 py-1.5", form.audience === a ? "border-ink bg-ink text-on-ink" : "border-line")}>{a === "all" ? "Everyone" : "Chosen customers"}</button>
                ))}
              </div>
              {form.audience === "selected" && (
                <textarea value={form.emails} onChange={(e) => set("emails", e.target.value)} rows={3} placeholder="One email per line" aria-label="Customer emails"
                  className="mt-2 w-full rounded-[8px] border border-line bg-paper p-3 outline-none focus:border-ink" />
              )}
            </fieldset>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[var(--ink)]" /> Live now</label>
            {err && <p className="font-semibold text-margin" role="alert">{err}</p>}
            <button onClick={save} disabled={busy} className="h-11 rounded-[10px] bg-ink font-semibold text-on-ink disabled:opacity-50">{busy ? "Saving…" : form.existing ? "Save changes" : "Create coupon"}</button>
          </div>
        )}
      </Sheet>
    </>
  );
}
