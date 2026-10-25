"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ReferralSheet({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const sb = supabaseBrowser();

  const apply = async () => {
    setBusy(true); setError(null);
    const { data, error } = await sb.rpc("apply_referral", { p_code: code.trim() });
    setBusy(false);
    if (error) return setError(error.message);
    setSuccess((data as { referrer_name?: string })?.referrer_name ?? "your friend");
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 }, colors: ["#0b5a45", "#f5b800", "#cf1f2b"] });
  };

  const skip = async () => {
    await sb.rpc("finish_onboarding", { p_skip_referral: true, p_welcome_seen: true });
    onDone();
  };

  return (
    <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-scrim sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby="ref-title"
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: "spring", stiffness: 360, damping: 32 }}
        className="w-full max-w-md rounded-t-[20px] bg-card p-6 pb-8 sm:rounded-[16px]"
      >
        {success ? (
          <div className="text-center">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 12 }} className="mx-auto grid size-16 place-items-center rounded-full bg-ok text-white">
              <Check className="size-8" strokeWidth={3} />
            </motion.span>
            <h2 id="ref-title" className="mt-4 text-2xl font-bold">Referral applied</h2>
            <p className="mt-1 text-muted">
              You and {success} will each get <b className="text-graphite">50 SuperCoins</b> once your first order is delivered and its 3-day return window closes.
            </p>
            <button onClick={onDone} className="mt-6 h-12 w-full rounded-[10px] bg-ink font-semibold text-on-ink">Start shopping</button>
          </div>
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-[12px] bg-nib-soft"><Gift className="size-6 text-nib" /></span>
            <h2 id="ref-title" className="mt-4 text-2xl font-bold">Got a friend&apos;s code?</h2>
            <p className="mt-1 text-muted">Enter it now and you both get 50 SuperCoins after your first order.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 6) void apply(); }} className="mt-5">
              <label htmlFor="ref-code" className="text-sm font-semibold">Referral code</label>
              <input
                id="ref-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                placeholder="GIXXXXXX"
                autoComplete="off"
                className="mt-1.5 h-12 w-full rounded-[10px] border border-line bg-card px-4 font-display text-lg font-bold tracking-[0.2em] outline-none focus:border-ink focus:ring-2 focus:ring-ink/15"
              />
              {error && <p className="mt-2 text-sm text-margin" role="alert">{error}</p>}
              <button disabled={busy || code.length < 6} className="mt-4 h-12 w-full rounded-[10px] bg-ink font-semibold text-on-ink disabled:opacity-50">
                {busy ? "Checking…" : "Apply code"}
              </button>
              <button type="button" onClick={skip} className="mt-2 h-11 w-full rounded-[10px] font-semibold text-muted hover:bg-paper">
                I don&apos;t have one
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
