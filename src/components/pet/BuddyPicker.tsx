"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import clsx from "clsx";
import { PETS, petSay } from "@/lib/pet";
import type { PetKind } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { PetArt } from "./PetArt";

export const BUDDY_ASKED = "ge-buddy-asked";

/**
 * Choose a shop buddy. Shown once after the welcome film (and once for people who signed up
 * before buddies existed). Also reused from the account page to change buddy.
 */
export function BuddyPicker({ onDone, current, asSheet }: { onDone: () => void; current?: PetKind | null; asSheet?: boolean }) {
  const { profile, refresh } = useSession();
  const reduce = useReducedMotion();
  const [pick, setPick] = useState<PetKind>(current ?? "mochi");
  // A name only counts as "custom" if it isn't just the species' default name
  const custom = profile?.pet_name && !PETS.some((p) => p.name === profile.pet_name) ? profile.pet_name : "";
  const [name, setName] = useState(custom);
  const [named, setNamed] = useState(!!custom);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [blink, setBlink] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const lx = useSpring(0, { stiffness: 240, damping: 22 }), ly = useSpring(0, { stiffness: 240, damping: 22 });

  const meta = PETS.find((p) => p.kind === pick)!;
  const shown = named ? name : meta.name;

  // All four buddies watch your finger or cursor
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const r = grid.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      lx.set((dx / d) * Math.min(3.2, d / 50)); ly.set((dy / d) * Math.min(3, d / 50));
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    let t: ReturnType<typeof setTimeout>;
    const loop = () => { t = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 140); loop(); }, 2200 + Math.random() * 2000); };
    loop();
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerdown", move); clearTimeout(t); };
  }, [lx, ly]);

  const adopt = async () => {
    setBusy(true); setErr(null);
    const finalName = (named ? name : meta.name).trim() || meta.name;
    const { error } = await supabaseBrowser().rpc("set_buddy", { p_pet: pick, p_name: finalName, p_hidden: false });
    setBusy(false);
    if (error) return setErr(error.message);
    try { localStorage.setItem(BUDDY_ASKED, "1"); } catch {}
    await refresh();
    onDone();
    setTimeout(() => petSay({ kind: "hello", name: finalName }), 1100);
  };

  const later = () => {
    try { localStorage.setItem(BUDDY_ASKED, "1"); } catch {}
    onDone();
  };

  const body = (
    <>
      {!asSheet && <p className="sign-type text-[15px] tracking-[0.12em] text-ink">New at the shop</p>}
      {!asSheet && <h2 id="buddy-title" className="mt-1 text-[34px] uppercase leading-none">Pick a shop buddy</h2>}
      <p className="mt-2 text-[15px] text-muted">They keep you company while you shop, cheer when you add things, and watch your order come in. Tap one to say hi.</p>

      <div ref={grid} role="radiogroup" aria-label="Shop buddies" className="mt-5 grid grid-cols-2 gap-2.5">
        {PETS.map((p) => {
          const on = p.kind === pick;
          return (
            <motion.button key={p.kind} type="button" role="radio" aria-checked={on}
              onClick={() => { setPick(p.kind); if (!named) setName(""); }}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className={clsx("relative flex flex-col items-center rounded-[14px] px-2 pb-3 pt-2 text-center transition-colors duration-150",
                on ? "bg-nib-soft ring-2 ring-ink" : "bg-sunk hover:bg-ink-soft")}>
              <motion.span animate={on && !reduce ? { y: [0, -10, 0] } : { y: 0 }} transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }} className="block">
                <PetArt kind={p.kind} mood={on ? "happy" : "idle"} blink={blink && !on} lookX={lx} lookY={ly} size={76} />
              </motion.span>
              <span className="mt-1 font-display text-[18px] font-extrabold uppercase leading-none">{p.name}</span>
              <span className="text-xs font-semibold text-muted">{p.species}</span>
            </motion.button>
          );
        })}
      </div>

      <motion.p key={pick} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 min-h-[2.5em] text-sm text-graphite">{meta.blurb}</motion.p>

      <label htmlFor="buddy-name" className="mt-2 block text-sm font-semibold">Name your buddy</label>
      <input id="buddy-name" value={named ? name : ""} placeholder={meta.name} maxLength={20} autoComplete="off"
        onChange={(e) => { setName(e.target.value); setNamed(e.target.value.length > 0); }}
        className="mt-1.5 h-12 w-full rounded-[10px] border border-line bg-card px-4 text-[16px] font-semibold text-graphite caret-ink outline-none placeholder:text-muted focus:border-ink focus:ring-2 focus:ring-ink/15" />
      {err && <p className="mt-2 text-sm text-margin" role="alert">{err}</p>}

      <button onClick={() => void adopt()} disabled={busy}
        className="press mt-4 h-12 w-full rounded-[10px] bg-nib font-bold text-on-nib disabled:opacity-60">
        {busy ? "Saying hello…" : current ? `Switch to ${shown}` : `Adopt ${shown}`}
      </button>
      {!asSheet && (
        <button type="button" onClick={later} className="mt-1.5 h-11 w-full rounded-[10px] font-semibold text-muted hover:bg-sunk">
          Maybe later
        </button>
      )}
    </>
  );

  if (asSheet) return body;

  return (
    <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-scrim sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="buddy-title"
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: "spring", stiffness: 360, damping: 32 }}
        className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-[20px] bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[16px]">
        {body}
      </motion.div>
    </motion.div>
  );
}
