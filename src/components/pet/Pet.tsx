"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";
import type { PetKind } from "@/lib/types";
import { IDLE_LINES, PET_LINES, TOUCH_LINES, react, type Mood, type PetEvent } from "@/lib/pet";
import { PetArt } from "./PetArt";

const SIZE = 64;

/**
 * The shop buddy. On a computer it trots after the cursor (and stops when you reach for it, so you
 * can pet it); on a phone it waits above the tab bar and looks wherever you tap. It reacts to adding,
 * removing, saving, searching, typing, checking out and ordering, and says how it feels in a bubble.
 */
export function Pet({ kind, name }: { kind: PetKind; name: string }) {
  const reduce = useReducedMotion();
  const path = usePathname();
  const [mood, setMood] = useState<Mood>("idle");
  const [line, setLine] = useState("");
  const [blink, setBlink] = useState(false);
  const [follow, setFollow] = useState(false);
  const [facing, setFacing] = useState(1);
  const [hearts, setHearts] = useState(0);
  const [below, setBelow] = useState(false); // near the top of the screen, the bubble hangs underneath

  const wrap = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActive = useRef(Date.now());
  const taps = useRef<number[]>([]);
  const idleSaid = useRef(0);
  const dragging = useRef(false);

  // Position (desktop follows the cursor; phones keep it docked and only hop)
  const tx = useMotionValue(0), ty = useMotionValue(0);
  const x = useSpring(tx, { stiffness: 110, damping: 17, mass: 0.8 });
  const y = useSpring(ty, { stiffness: 110, damping: 17, mass: 0.8 });
  const lx = useSpring(0, { stiffness: 260, damping: 22 }), ly = useSpring(0, { stiffness: 260, damping: 22 });

  const feel = useCallback((m: Mood, text = "", ms = 2600) => {
    if (moodTimer.current) clearTimeout(moodTimer.current);
    setMood(m);
    setLine(text);
    lastActive.current = Date.now();
    if (m === "love") setHearts((h) => h + 1);
    if (!reduce && body.current && m !== "idle" && m !== "curious" && m !== "sleepy") {
      const jump = m === "celebrate" ? [0, -34, 0, -16, 0] : m === "excited" || m === "surprised" ? [0, -18, 0] : m === "sad" ? [0, 4, 0] : [0, -6, 0];
      void animate(body.current, { y: jump, rotate: m === "celebrate" ? [0, 0, 360, 360, 360] : 0 }, { duration: m === "celebrate" ? 1 : 0.5, ease: [0.23, 1, 0.32, 1] });
    }
    moodTimer.current = setTimeout(() => { setMood("idle"); setLine(""); }, ms);
  }, [reduce]);

  // Docked (phones): sit just above whatever is pinned to the bottom (tab bar, order island,
  // checkout slider, buy bar) so the buddy never covers a button
  const [lift, setLift] = useState(84);
  const [side, setSide] = useState<"left" | "right">("left");
  useEffect(() => {
    if (follow) return;
    const measure = () => {
      let top = window.innerHeight;
      document.querySelectorAll<HTMLElement>("[data-pet-avoid]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const near = side === "left" ? r.left < 140 : r.right > window.innerWidth - 140;
        if (r.height > 0 && r.width > 0 && r.bottom > window.innerHeight - 140 && near) top = Math.min(top, r.top);
      });
      setLift(Math.max(12, Math.round(window.innerHeight - top + 10)));
    };
    measure();
    const t = setInterval(measure, 400);
    window.addEventListener("resize", measure);
    return () => { clearInterval(t); window.removeEventListener("resize", measure); };
  }, [follow, path, side]);

  // Docked: if you start typing in a field it's sitting on, it hops to the other side
  useEffect(() => {
    if (follow) return;
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (!t?.matches?.("input, textarea, select") || wrap.current?.contains(t)) return;
      const a = t.getBoundingClientRect(), b = wrap.current?.getBoundingClientRect();
      if (!b) return;
      const hit = a.left < b.right + 8 && a.right > b.left - 8 && a.top < b.bottom + 8 && a.bottom > b.top - 8;
      if (hit) setSide((s) => (s === "left" ? "right" : "left"));
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [follow]);

  // Desktop with a real mouse: follow the cursor
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine) and (min-width: 768px)").matches && !reduce;
    setFollow(fine);
    if (fine) { tx.set(window.innerWidth - SIZE - 28); ty.set(window.innerHeight - SIZE - 28); x.jump(tx.get()); y.jump(ty.get()); }
  }, [reduce, tx, ty, x, y]);

  // Watch the pointer: eyes always track it; on desktop the buddy walks after it
  useEffect(() => {
    let frame = 0, px = 0, py = 0, kindOf = "mouse";
    const tick = () => {
      frame = 0;
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.45;
      const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
      lx.set((dx / d) * Math.min(3.2, d / 40));
      ly.set((dy / d) * Math.min(3, d / 40));
      if (follow && kindOf === "mouse" && !dragging.current) {
        // Stop when the cursor comes close, so it can be clicked and petted
        if (d > 78) {
          const nx = Math.min(window.innerWidth - SIZE - 8, Math.max(8, px + 22));
          const ny = Math.min(window.innerHeight - SIZE - 8, Math.max(8, py + 18));
          setFacing(nx < tx.get() - 2 ? -1 : nx > tx.get() + 2 ? 1 : facing);
          tx.set(nx); ty.set(ny);
          setBelow(ny < 110);
        }
      }
    };
    const move = (e: PointerEvent) => {
      px = e.clientX; py = e.clientY; kindOf = e.pointerType;
      lastActive.current = Date.now();
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const down = (e: PointerEvent) => {
      move(e);
      // Phones: a little hop toward where you tapped
      if (!follow && e.pointerType !== "mouse" && !reduce && !wrap.current?.contains(e.target as Node)) {
        const r = wrap.current?.getBoundingClientRect();
        if (r) {
          const dir = Math.sign(e.clientX - (r.left + r.width / 2));
          setFacing(dir || 1);
          void animate(tx, [0, dir * 14, 0], { duration: 0.5, ease: [0.23, 1, 0.32, 1] });
          void animate(ty, [0, -10, 0], { duration: 0.5, ease: [0.23, 1, 0.32, 1] });
        }
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerdown", down); if (frame) cancelAnimationFrame(frame); };
  }, [follow, reduce, lx, ly, tx, ty, facing]);

  // Shop events
  useEffect(() => {
    const on = (ev: Event) => {
      const e = (ev as CustomEvent<PetEvent>).detail;
      if (!e) return;
      if (e.kind === "typing") {
        // Watch the letters go by: eyes drift right as you type, glance down at the field
        lx.set(-2.8 + ((e.len % 12) / 12) * 5.6); ly.set(2.4);
        if (mood !== "curious" || line) feel("curious", "", 1300); else { if (moodTimer.current) clearTimeout(moodTimer.current); moodTimer.current = setTimeout(() => setMood("idle"), 1300); }
        lastActive.current = Date.now();
        return;
      }
      const r = react(e, name);
      feel(r.mood, r.line, r.ms);
    };
    window.addEventListener("ge:pet", on);
    return () => window.removeEventListener("ge:pet", on);
  }, [feel, name, lx, ly, mood, line]);

  // Typing anywhere in the shop (never in password fields)
  useEffect(() => {
    const onInput = (e: Event) => {
      const t = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!t || !("value" in t) || (t as HTMLInputElement).type === "password") return;
      window.dispatchEvent(new CustomEvent("ge:pet", { detail: { kind: "typing", len: t.value.length } }));
    };
    document.addEventListener("input", onInput, true);
    return () => document.removeEventListener("input", onInput, true);
  }, []);

  // Blinking, dozing off, and the occasional idle remark
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 140); loop(); }, 2600 + Math.random() * 2600);
    };
    loop();
    const watch = setInterval(() => {
      const quiet = Date.now() - lastActive.current;
      if (quiet > 45_000) setMood((m) => (m === "idle" ? "sleepy" : m));
      else if (quiet > 22_000 && idleSaid.current < 2 && Math.random() < 0.08) { idleSaid.current += 1; feel("happy", IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)], 3200); }
    }, 5000);
    return () => { clearTimeout(t); clearInterval(watch); };
  }, [feel]);

  // Say hello on a new page now and then (wakes up if it was asleep)
  useEffect(() => { setMood((m) => (m === "sleepy" ? "idle" : m)); lastActive.current = Date.now(); }, [path]);

  const touch = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1400), now];
    if (taps.current.length >= 3) feel("love", PET_LINES[Math.floor(Math.random() * PET_LINES.length)], 2600);
    else feel("happy", TOUCH_LINES[Math.floor(Math.random() * TOUCH_LINES.length)], 1800);
    if (!reduce && body.current) void animate(body.current, { scaleY: [1, 0.82, 1.06, 1], scaleX: [1, 1.12, 0.96, 1] }, { duration: 0.45 });
  };

  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <motion.div ref={wrap}
      className={follow ? "pointer-events-none fixed left-0 top-0 z-[45]" : `pointer-events-none fixed z-[45] transition-[bottom,left,right] duration-300 [transition-timing-function:var(--ease-out)] ${side === "left" ? "left-3 md:left-6" : "right-3 md:right-6"}`}
      style={{ x, y, width: follow ? SIZE : 56, height: follow ? SIZE : 56, bottom: follow ? undefined : lift }}>
      {/* speech bubble */}
      <AnimatePresence>
        {line && (
          <motion.div key={line} initial={{ opacity: 0, y: 6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.3 }}
            className={`absolute ${below ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+6px)]"} w-max max-w-[200px] rounded-[12px] bg-card px-3 py-2 text-[13px] font-semibold leading-snug text-graphite shadow-float ${follow ? "right-1/2 translate-x-[30%]" : side === "left" ? "left-0" : "right-0"}`}
            style={{ transformOrigin: `${follow ? "70%" : "20%"} ${below ? "0%" : "100%"}` }} aria-hidden>
            {line}
            <span className={`absolute ${below ? "-top-1.5" : "-bottom-1.5"} size-3 rotate-45 bg-card ${follow ? "right-[30%]" : side === "left" ? "left-6" : "right-6"}`} />
          </motion.div>
        )}
        {mood === "curious" && !line && (
          <motion.div key="dots" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute -top-3 right-0 flex gap-0.5 rounded-full bg-card px-2 py-1 shadow-float" aria-hidden>
            {[0, 1, 2].map((i) => <span key={i} className="pet-dot size-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </motion.div>
        )}
        {mood === "sleepy" && (
          <motion.span key="z" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sign-type pet-z absolute -top-2 right-0 text-[18px] text-ink" aria-hidden>z z</motion.span>
        )}
      </AnimatePresence>

      {/* little hearts float up when it's happy with you */}
      <AnimatePresence>
        {mood === "love" && [0, 1, 2].map((i) => (
          <motion.span key={`${hearts}-${i}`} className="absolute left-1/2 top-2 text-[#e8394b]" aria-hidden
            initial={{ opacity: 0, x: -6, y: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 0], x: -6 + (i - 1) * 16, y: -46 - i * 8, scale: 1 }}
            transition={{ duration: 1.3, delay: i * 0.15, ease: "easeOut" }}>
            <svg width="14" height="14" viewBox="0 0 12 12"><path d="M6 10.5 1.2 5.8A2.7 2.7 0 0 1 6 2.6a2.7 2.7 0 0 1 4.8 3.2z" fill="currentColor" /></svg>
          </motion.span>
        ))}
        {mood === "celebrate" && [0, 1, 2, 3, 4].map((i) => (
          <motion.span key={`s${i}`} className="absolute left-1/2 top-1/2" aria-hidden
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.4 }} animate={{ opacity: 0, x: Math.cos(i * 1.26) * 48, y: Math.sin(i * 1.26) * 48 - 10, scale: 1, rotate: 90 }}
            transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}>
            <svg width="12" height="12" viewBox="0 0 10 10"><path d="M5 0l1.3 3.5L10 5 6.3 6.5 5 10 3.7 6.5 0 5l3.7-1.5z" fill={i % 2 ? "#f5b800" : "#cf1f2b"} /></svg>
          </motion.span>
        ))}
      </AnimatePresence>

      <motion.div role="button" tabIndex={0} aria-label={`${name}, your shop buddy. Tap to play.`}
        className="pointer-events-auto relative size-full cursor-grab touch-none select-none rounded-full outline-offset-4 active:cursor-grabbing"
        drag dragSnapToOrigin={!follow} dragElastic={0.6} dragMomentum={false}
        onDragStart={() => { dragging.current = true; feel("excited", "Wheee!", 1600); }}
        onDragEnd={(_, i) => {
          dragging.current = false;
          if (follow) { tx.set(Math.min(window.innerWidth - SIZE - 8, Math.max(8, tx.get() + i.offset.x))); ty.set(Math.min(window.innerHeight - SIZE - 8, Math.max(8, ty.get() + i.offset.y))); }
        }}
        onTap={touch}
        onPointerDown={() => { press.current = setTimeout(() => feel("love", PET_LINES[0], 2600), 550); }}
        onPointerUp={() => { if (press.current) clearTimeout(press.current); }}
        onPointerLeave={() => { if (press.current) clearTimeout(press.current); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); touch(); } }}>
        <span className="absolute inset-x-2 bottom-0 h-2 rounded-full bg-black/15 blur-[1px]" aria-hidden />
        <div ref={body} className={mood === "idle" || mood === "sleepy" ? "pet-breathe" : ""} style={{ transformOrigin: "50% 90%" }}>
          <div style={{ transform: `scaleX(${facing})`, transition: "transform 200ms" }}>
            <PetArt kind={kind} mood={mood} blink={blink} lookX={lx} lookY={ly} size={follow ? SIZE : 56} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
