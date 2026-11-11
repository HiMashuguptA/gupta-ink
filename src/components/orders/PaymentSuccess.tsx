"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import confetti from "canvas-confetti";

/**
 * Shown once when an online payment goes through: rings ripple out, a green disc pops in,
 * the tick draws itself, the amount counts up, then confetti. Tap anywhere (or wait) to close.
 */
export function PaymentSuccess({ open, amountPaise, orderNo, onDone }: { open: boolean; amountPaise: number; orderNo: string; onDone: () => void }) {
  const [mounted, setMounted] = useState(false);
  const count = useMotionValue(0);
  const shown = useTransform(count, (v) => `₹${Math.round(v).toLocaleString("en-IN")}`);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    count.set(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = animate(count, amountPaise / 100, { duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] });
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!reduce) {
      const colors = ["#16a34a", "#f5b800", "#0b5a45", "#ffffff"];
      timers.push(setTimeout(() => confetti({ particleCount: 90, spread: 75, startVelocity: 42, origin: { y: 0.42 }, colors, zIndex: 90 }), 700));
      timers.push(setTimeout(() => {
        confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors, zIndex: 90 });
        confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors, zIndex: 90 });
      }, 1000));
    }
    timers.push(setTimeout(onDone, 4200));
    return () => { c.stop(); timers.forEach(clearTimeout); };
  }, [open, amountPaise, count, onDone]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div role="status" aria-live="polite" className="fixed inset-0 z-[80] grid place-items-center bg-scrim p-6 backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onDone}>
          <motion.div className="relative w-full max-w-[320px] rounded-[20px] bg-card px-6 pb-7 pt-10 text-center shadow-float"
            initial={{ y: 40, scale: 0.92, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}>
            <div className="relative mx-auto grid size-28 place-items-center">
              {/* Ripples */}
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="absolute inset-0 rounded-full border-2 border-ok/50"
                  initial={{ scale: 0.6, opacity: 0.8 }} animate={{ scale: 1.9, opacity: 0 }}
                  transition={{ delay: 0.35 + i * 0.35, duration: 1.4, ease: "easeOut", repeat: 1, repeatDelay: 0.6 }} />
              ))}
              {/* Disc + tick */}
              <motion.svg viewBox="0 0 52 52" className="relative size-24 drop-shadow-[0_8px_18px_rgba(22,163,74,0.35)]"
                initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.1 }} aria-hidden>
                <circle cx="26" cy="26" r="25" fill="#16a34a" />
                <motion.path d="M14.5 27 l8 8 l15.5 -17" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.5, ease: [0.65, 0, 0.35, 1] }} />
              </motion.svg>
            </div>
            <motion.p className="mt-5 text-sm font-semibold uppercase tracking-wide text-ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              Payment successful
            </motion.p>
            <motion.p className="num sign-type mt-1 text-[40px] leading-none text-graphite">{shown}</motion.p>
            <motion.p className="mt-3 text-sm text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
              Order <b className="text-graphite">{orderNo}</b> is confirmed. We&apos;ve emailed your receipt.
            </motion.p>
            <motion.p className="mt-4 text-xs text-muted" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 1.8 }}>Tap anywhere to continue</motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Full-screen "please wait" while the shop opens the payment page or checks the result. */
export function PaymentWait({ open, title, body }: { open: boolean; title: string; body?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div role="status" aria-live="polite" className="fixed inset-0 z-[80] grid place-items-center bg-scrim p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="w-full max-w-[300px] rounded-[20px] bg-card px-6 py-8 text-center shadow-float" initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
            <div className="relative mx-auto size-16">
              <span className="absolute inset-0 rounded-full border-4 border-ink/15" />
              <motion.span className="absolute inset-0 rounded-full border-4 border-transparent border-t-ink" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} />
              <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto size-7 text-ink" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <p className="mt-4 font-bold">{title}</p>
            {body && <p className="mt-1 text-sm text-muted">{body}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
