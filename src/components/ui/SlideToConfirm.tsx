"use client";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowRight, Check, Loader2, ChevronRight } from "lucide-react";
import clsx from "clsx";

/**
 * Slide to place the order (after Skiper's "Draggable snap button" + Aceternity's "Stateful button").
 * A small push to the right (or a tap on the handle or the bar) finishes the slide by itself,
 * then shows a spinner and a tick. Keyboard: focus the handle and press Enter.
 */
export function SlideToConfirm({
  label, sub, disabled, disabledLabel, busy, done, onConfirm, className,
}: {
  label: string; sub?: React.ReactNode; disabled?: boolean; disabledLabel?: string;
  busy?: boolean; done?: boolean; onConfirm: () => void; className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(0);
  const x = useMotionValue(0);
  const reduce = useReducedMotion();
  const THUMB = 52;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setMax(el.clientWidth - THUMB - 8));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Back to the start if the order didn't go through
  useEffect(() => { if (!busy && !done) void animate(x, 0, { type: "spring", duration: 0.45, bounce: 0.2 }); }, [busy, done, x]);

  const fill = useTransform(x, (v) => (max ? (v + THUMB + 8) / (max + THUMB + 8) : 0));
  const labelOpacity = useTransform(x, [0, Math.max(1, max * 0.6)], [1, 0]);

  const fire = () => { if (!disabled && !busy && !done) onConfirm(); };
  // Glide the handle the rest of the way, then place the order
  const finish = () => {
    if (disabled || busy || done) return;
    void animate(x, max, reduce ? { duration: 0 } : { type: "spring", duration: 0.35, bounce: 0 });
    fire();
  };

  return (
    <div ref={track} onClick={(e) => { if (e.target === e.currentTarget || !(e.target as HTMLElement).closest("button")) finish(); }}
      className={clsx("relative h-[60px] select-none overflow-hidden rounded-[13px] p-1", disabled ? "bg-sunk" : "cursor-pointer bg-sign", className)}>
      <motion.div aria-hidden className="absolute inset-0 origin-left rounded-[13px] bg-nib" style={{ scaleX: disabled ? 0 : fill }} />
      <motion.div aria-hidden style={{ opacity: busy || done ? 0 : labelOpacity }}
        className={clsx("pointer-events-none absolute inset-0 flex flex-col items-center justify-center pl-12 text-center leading-tight", disabled ? "text-muted" : "text-on-sign")}>
        {disabled ? (
          <span className="line-clamp-2 px-2 text-[14px] font-bold leading-tight">{disabledLabel ?? label}</span>
        ) : (
          <span className="sign-type flex items-center gap-1 t-h5">
            {label}
            <span className="flex text-nib">{[0, 1, 2].map((k) => (
              <ChevronRight key={k} className="-ml-2 size-4 first:ml-0" style={reduce ? undefined : { animation: `chev 1.4s ${k * 0.15}s infinite ease-in-out` }} />
            ))}</span>
          </span>
        )}
        {sub && <span className={clsx("text-[12px]", disabled ? "text-muted" : "text-on-sign-muted")}>{sub}</span>}
      </motion.div>
      {(busy || done) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sign-type pointer-events-none absolute inset-0 flex items-center justify-center pr-12 t-h5 text-on-nib">
          {done ? "Order placed" : "Placing your order"}
        </motion.div>
      )}
      <motion.button type="button" role="button" disabled={disabled}
        aria-label={`${label}. Press Enter to confirm`} aria-busy={busy}
        drag={disabled || busy || done ? false : "x"} dragConstraints={{ left: 0, right: max }} dragElastic={0.04} dragMomentum={false}
        style={{ x }}
        onDragEnd={(_, info) => {
          // Even a short push or a flick to the right is enough
          if (x.get() > Math.min(28, max * 0.15) || info.velocity.x > 250) finish();
          else void animate(x, 0, { type: "spring", duration: 0.45, bounce: 0.25 });
        }}
        onTap={() => { if (Math.abs(x.get()) < 4) finish(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); finish(); } }}
        className={clsx("relative z-10 grid h-[52px] w-[52px] cursor-grab touch-none place-items-center rounded-[10px] shadow-[0_4px_10px_-2px_rgb(0_0_0/0.35)] active:cursor-grabbing disabled:cursor-not-allowed disabled:shadow-none",
          disabled ? "bg-card text-muted" : "bg-nib text-on-nib")}>
        {done ? <Check className="size-6" strokeWidth={3} /> : busy ? <Loader2 className="size-6 animate-spin" /> : <ArrowRight className="size-6" />}
      </motion.button>
      <style>{`@keyframes chev { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}
