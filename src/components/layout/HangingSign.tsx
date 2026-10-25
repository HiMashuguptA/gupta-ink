"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import { hoursSummary, signState, type StoreHours } from "@/lib/hours";

/**
 * The shop's two-sided OPEN / CLOSED board, hung from a nail in the header.
 * It swings in on its strings when the page loads, flips over when the store opens or closes,
 * and swings again when tapped (which also shows today's hours).
 */
export function HangingSign({ hours }: { hours: StoreHours | null }) {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);

  // Status comes from the clock in the browser (the page itself is cached for everyone)
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const s = now ? signState(hours, now) : null;

  const swing = (strength = 1) => {
    if (reduce || !scope.current) return;
    void animate(scope.current, { rotate: [-11 * strength, 7 * strength, -3.5 * strength, 1.5 * strength, 0] },
      { duration: 1.4, ease: [0.22, 1, 0.36, 1], times: [0, 0.3, 0.55, 0.78, 1] });
  };

  // Swing in once the status is known, and again whenever it flips
  const swingRef = useRef(swing);
  swingRef.current = swing;
  const isOpen = s?.open;
  useEffect(() => { if (isOpen !== undefined) swingRef.current(1); }, [isOpen]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button type="button" onClick={() => { setOpen((o) => !o); swing(0.6); }} aria-expanded={open}
        aria-label={s ? `Store ${s.title.toLowerCase()}. ${s.line}. Show hours` : "Store hours"}
        className="relative block h-[58px] w-[96px] [perspective:420px]">
        {/* nail and strings */}
        <svg viewBox="0 0 96 22" className="absolute inset-x-0 top-0 h-[22px] w-full" aria-hidden>
          <path d="M16 22 L48 4 L80 22" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-on-sign-muted" strokeLinecap="round" />
          <circle cx="48" cy="4" r="3" className="fill-nib" />
        </svg>
        <motion.span ref={scope} className="absolute inset-x-0 top-[3px] block h-[55px]" style={{ transformOrigin: "50% 1px" }}>
          <motion.span className="absolute inset-x-0 bottom-0 block h-[36px] [transform-style:preserve-3d]"
            animate={{ rotateY: s && !s.open ? 180 : 0 }} transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.7, bounce: 0.25 }}>
            <Face className="bg-nib text-on-nib" title="Open" line={s?.open ? s.line : ""} />
            <Face className="bg-margin text-white [transform:rotateY(180deg)]" title="Closed" line={s && !s.open ? s.line : ""} />
          </motion.span>
        </motion.span>
        {!s && <span className="absolute inset-x-2 bottom-0 h-[36px] rounded-md bg-white/15" aria-hidden />}
      </button>

      <AnimatePresence>
        {open && hours && s && (
          <motion.div role="dialog" aria-label="Store hours"
            initial={{ opacity: 0, scale: 0.96, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} style={{ transformOrigin: "50% 0" }}
            className="absolute right-[-60px] top-[62px] z-50 w-64 rounded-[12px] bg-card p-4 text-graphite shadow-float">
            <p className={clsx("sign-type text-xl", s.open ? "text-ok" : "text-margin")}>{s.open ? "We're open" : "We're closed"}</p>
            <p className="mt-1 text-sm text-muted">{s.detail}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {hoursSummary(hours).map((r) => (
                <div key={r.label} className="flex justify-between gap-3"><dt className="text-muted">{r.label}</dt><dd className="num font-semibold">{r.value}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">Khedi Market, opposite Hotel Galaxy</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Face({ className, title, line }: { className: string; title: string; line: string }) {
  return (
    <span className={clsx("absolute inset-0 flex flex-col items-center justify-center rounded-[6px] px-1 leading-none [backface-visibility:hidden] shadow-[0_3px_6px_-1px_rgb(0_0_0/0.3)]", className)}>
      <span className="sign-type text-[18px]">{title}</span>
      {line && <span className="sign-type mt-[1px] max-w-full truncate text-[11.5px] opacity-90">{line}</span>}
    </span>
  );
}
