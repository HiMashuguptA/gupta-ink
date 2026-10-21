"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { uploadPhoto } from "@/lib/upload";
import { rupees } from "@/lib/format";

/**
 * Pay the customer by UPI in your phone app first, then upload the screenshot here.
 * The screenshot goes into the customer's folder so they can see it on their order.
 */
export function RefundProofForm({ customerId, amountPaise, upiId, submit }: {
  customerId: string; amountPaise: number; upiId: string | null;
  submit: (proofPath: string, utr: string | undefined) => PromiseLike<{ error: { message: string } | null }>;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const go = async () => {
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const path = await uploadPhoto("refund-proofs", customerId, file);
      const { error } = await submit(path, utr || undefined);
      if (error) throw new Error(error.message);
      setMsg({ ok: true, text: "Refund recorded. The customer has been told." });
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl bg-nib-soft p-3 text-sm">
      <p className="font-semibold">Send {rupees(amountPaise)} to <span className="select-all">{upiId ?? "the customer's UPI ID"}</span></p>
      <p className="text-muted">Pay from your UPI app, then add the screenshot here.</p>
      {upiId && (
        <a href={`upi://pay?pa=${encodeURIComponent(upiId)}&am=${(amountPaise / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent("Gupta Ink refund")}`}
          className="mt-2 inline-block rounded-lg border border-ink px-3 py-1.5 font-semibold text-ink md:hidden">Open UPI app</a>
      )}
      <label className="mt-2 flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink/40 bg-card px-3">
        <Upload className="size-4" /> <span className="truncate">{file ? file.name : "Choose payment screenshot"}</span>
        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <input value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12-digit UTR (optional)" inputMode="numeric"
        className="mt-2 h-10 w-full rounded-lg border border-line bg-card px-3 outline-none focus:border-ink" aria-label="UPI reference" />
      <button disabled={!file || busy} onClick={go} className="mt-2 h-10 w-full rounded-lg bg-ok font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Refund sent"}</button>
      {msg && <p className={`mt-2 font-semibold ${msg.ok ? "text-ok" : "text-margin"}`} role="status">{msg.text}</p>}
    </div>
  );
}
