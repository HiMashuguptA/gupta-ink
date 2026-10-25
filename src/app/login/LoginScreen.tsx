"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoMark } from "@/components/brand/Logo";
import { supabaseBrowser } from "@/lib/supabase/client";

const LINES = [
  "Every great idea starts on paper.",
  "Fresh notebooks, sharp pencils, in under an hour.",
  "From Khedi Market to your desk.",
  "Write it down. We'll bring the pen.",
];

function Floater({ children, className, delay = 0, drift = 14 }: { children: React.ReactNode; className: string; delay?: number; drift?: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -drift, 0] }}
      transition={{ opacity: { delay, duration: 0.8 }, y: { delay, duration: 6, repeat: Infinity, ease: "easeInOut" } }}
      aria-hidden
    >
      {children}
    </motion.div>
  );
}

export function LoginScreen({ next, error }: { next: string; error?: string }) {
  const [line, setLine] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(error ?? null);

  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % LINES.length), 3400);
    return () => clearInterval(t);
  }, []);

  const signIn = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setBusy(false);
      setErr("Google sign-in isn't available right now. Please try again in a moment.");
    }
  };

  return (
    <main className="ruled relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-10">
      {/* drifting stationery */}
      <Floater className="left-[12%] top-[14%]" delay={0.6}>
        <svg width="70" height="70" viewBox="0 0 70 70"><g transform="rotate(-30 35 35)"><rect x="29" y="4" width="12" height="48" rx="2" fill="#e2a400" /><rect x="29" y="2" width="12" height="7" fill="#e45b7a" /><path d="M29 52h12l-6 14z" fill="#f2cf9a" /><path d="M33 60h4l-2 6z" fill="#1c2030" /></g></svg>
      </Floater>
      <Floater className="right-[10%] top-[20%]" delay={1} drift={20}>
        <svg width="86" height="60" viewBox="0 0 74 52"><path d="M2 26 L72 2 L46 50 L34 32 Z" fill="#1f2a6e" /><path d="M34 32 L72 2 L28 30 Z" fill="#3f5bd8" /></svg>
      </Floater>
      <Floater className="bottom-[16%] left-[8%]" delay={1.3} drift={10}>
        <svg width="80" height="64" viewBox="0 0 80 64"><rect x="6" y="8" width="56" height="50" rx="4" fill="#ffd84a" transform="rotate(-8 34 33)" /><rect x="16" y="4" width="56" height="50" rx="4" fill="#ff8fb1" transform="rotate(6 44 29)" /></svg>
      </Floater>
      <Floater className="bottom-[12%] right-[12%]" delay={0.9} drift={16}>
        <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="none" stroke="#d9534a" strokeWidth="3" strokeDasharray="4 6" /><circle cx="32" cy="32" r="5" fill="#e9a23b" /></svg>
      </Floater>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative w-full max-w-sm text-center">
        <div className="mx-auto w-fit"><LogoMark size={88} animated /></div>
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-5 font-display text-4xl font-extrabold tracking-tight text-ink-deep">
          Gupta Enterprises
        </motion.h1>
        <p className="mt-1 text-sm font-semibold text-muted">Stationery in minutes, Kohima</p>

        <div className="mt-6 h-9" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p key={line} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="font-hand text-[26px] leading-none text-ink">
              {LINES[line]}
            </motion.p>
          </AnimatePresence>
        </div>

        <motion.button
          onClick={signIn}
          disabled={busy}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-8 flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-line bg-card py-3.5 text-[15px] font-bold text-graphite shadow-sm transition-shadow hover:shadow-md disabled:opacity-70"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          {busy ? "Opening Google…" : "Continue with Google"}
        </motion.button>
        {err && <p className="mt-3 text-sm text-margin" role="alert">{err}</p>}

        <p className="mt-6 text-xs leading-relaxed text-muted">
          By continuing you agree to our <Link href="/policies/terms" className="font-semibold underline">Terms</Link> and{" "}
          <Link href="/policies/privacy" className="font-semibold underline">Privacy policy</Link>.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-ink">Browse without signing in</Link>
      </motion.div>
    </main>
  );
}
