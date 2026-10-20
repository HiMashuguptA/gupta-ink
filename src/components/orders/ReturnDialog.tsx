"use client";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Minus, Plus } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { rupees } from "@/lib/format";
import { uploadPhoto } from "@/lib/upload";
import { Sheet } from "@/components/ui/Sheet";
import { PhotoPicker } from "./PhotoPicker";

type Opt = { order_item_id: string; name: string; variant_label: string | null; image_url: string | null; qty: number; returnable: boolean; available: number; unit_refund_paise: number };
const REASONS = ["Damaged or broken", "Doesn't work properly", "Wrong item sent", "Missing parts", "Quality not as shown", "Other"];

export function ReturnDialog({ open, onClose, orderId, onDone }: { open: boolean; onClose: () => void; orderId: string; onDone: () => void }) {
  const sb = supabaseBrowser();
  const { user } = useSession();
  const toast = useToast();
  const [opts, setOpts] = useState<Opt[] | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [upi, setUpi] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void sb.rpc("return_options", { p_order: orderId }).then(({ data, error }) => {
      if (error) return toast({ kind: "error", title: "Couldn't load items", body: error.message });
      setOpts(((data as { items: Opt[] }).items) ?? []);
    });
  }, [open, orderId, sb, toast]);

  const total = useMemo(() => (opts ?? []).reduce((a, o) => a + (qty[o.order_item_id] ?? 0) * o.unit_refund_paise, 0), [opts, qty]);
  const chosen = Object.values(qty).some((n) => n > 0);
  const upiOk = /^[a-z0-9._-]{2,64}@[a-z]{2,64}$/i.test(upi);
  const ready = chosen && files.length > 0 && upiOk && (reason !== "Other" || detail.trim().length >= 5);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const paths = await Promise.all(files.map((f) => uploadPhoto("returns", user.id, f)));
      const items = Object.entries(qty).filter(([, n]) => n > 0).map(([order_item_id, n]) => ({ order_item_id, qty: n }));
      const { error } = await sb.rpc("request_return", {
        p_order: orderId, p_items: items, p_photos: paths, p_refund_upi: upi,
        p_reason: [reason, detail.trim()].filter(Boolean).join(": "),
      });
      if (error) throw new Error(error.message);
      toast({ kind: "ok", title: "Return requested", body: "We'll check it within a day." });
      setQty({}); setFiles([]); setDetail("");
      onDone(); onClose();
    } catch (e) {
      toast({ kind: "error", title: "Couldn't send the request", body: (e as Error).message });
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Return items" wide>
      {!opts ? <div className="skeleton h-40 rounded-2xl" /> : (
        <div className="space-y-5">
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {opts.map((o) => {
              const n = qty[o.order_item_id] ?? 0;
              const can = o.returnable && o.available > 0;
              return (
                <li key={o.order_item_id} className={clsx("flex items-center gap-3 p-3", !can && "opacity-60")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.image_url ?? "/brand/logo.svg"} alt="" className="size-12 rounded-lg" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-semibold">{o.name}</p>
                    <p className="text-xs text-muted">
                      {!o.returnable ? "Can't be returned" : o.available === 0 ? "Already returned" : `${rupees(o.unit_refund_paise)} back each · up to ${o.available}`}
                    </p>
                  </div>
                  {can && (
                    <div className="flex items-center gap-1 rounded-full border border-line">
                      <button type="button" onClick={() => setQty((q) => ({ ...q, [o.order_item_id]: Math.max(0, n - 1) }))} className="grid size-8 place-items-center" aria-label={`Fewer ${o.name}`} disabled={n === 0}><Minus className="size-4" /></button>
                      <span className="w-5 text-center text-sm font-bold" aria-live="polite">{n}</span>
                      <button type="button" onClick={() => setQty((q) => ({ ...q, [o.order_item_id]: Math.min(o.available, n + 1) }))} className="grid size-8 place-items-center" aria-label={`More ${o.name}`} disabled={n >= o.available}><Plus className="size-4" /></button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">What&apos;s wrong?</legend>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r}
                  className={clsx("rounded-full border px-3 py-1.5 text-sm", reason === r ? "border-ink bg-ink text-white" : "border-line")}>{r}</button>
              ))}
            </div>
            <textarea value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 500))} rows={2} placeholder={reason === "Other" ? "Tell us what happened" : "More detail (optional)"}
              className="mt-2 w-full rounded-xl border border-line bg-paper p-3 text-sm outline-none focus:border-ink" aria-label="Details" />
          </fieldset>

          <PhotoPicker files={files} onChange={setFiles} max={5} label="Photos of the items (1 to 5)" />

          <div>
            <label htmlFor="ret-upi" className="text-sm font-semibold">UPI ID for your refund</label>
            <input id="ret-upi" value={upi} onChange={(e) => setUpi(e.target.value.trim())} placeholder="name@okaxis" autoComplete="off"
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:border-ink" />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-ink-soft px-3 py-2.5 text-sm">
            <span>Refund if approved</span><b className="text-base">{rupees(total)}</b>
          </div>
          <p className="text-xs text-muted">Coupon and SuperCoin savings are shared across items, and delivery fees aren&apos;t refunded. We pick up from your address (or you bring pickup orders to the store), check the items, then pay by UPI.</p>
          <button onClick={submit} disabled={!ready || busy} className="h-12 w-full rounded-xl bg-ink font-semibold text-white disabled:opacity-40">
            {busy ? "Sending…" : "Request return"}
          </button>
        </div>
      )}
    </Sheet>
  );
}
