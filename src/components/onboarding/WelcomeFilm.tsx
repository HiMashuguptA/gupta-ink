"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { LogoMark } from "@/components/brand/Logo";

/**
 * A 5-second welcome "film" for first-time users: a paper plane carries their
 * name over a sketched Kohima skyline, then a stationery confetti burst.
 */
export function WelcomeFilm({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const burst = setTimeout(() => {
      if (reduce) return;
      const colors = ["#f5b800", "#cf1f2b", "#ffffff", "#0b5a45", "#ffd451"];
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.55 }, colors, scalar: 1.1, shapes: ["square", "circle"] });
      setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 220);
      setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 380);
    }, 3000);
    const end = setTimeout(onDone, 5200);
    return () => { clearTimeout(burst); clearTimeout(end); };
  }, [onDone]);

  const first = name.split(" ")[0] || "friend";

  return (
    <motion.div
      className="fixed inset-0 z-[80] overflow-hidden bg-sign text-on-sign"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Welcome to Gupta Enterprises"
    >

      {/* sketched Kohima hills */}
      <svg className="absolute inset-x-0 bottom-0 w-full" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden>
        <motion.path
          d="M0 120 C40 80 70 70 110 95 S170 60 210 80 S280 40 320 70 S380 60 400 75 V140 H0z"
          fill="#0f6b52"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.path
          d="M0 130 C50 105 90 100 140 115 S220 95 260 108 S340 92 400 105 V140 H0z"
          fill="#073d2f"
          initial={{ y: 30 }} animate={{ y: 0 }} transition={{ duration: 1.2, delay: 0.15, ease: "easeOut" }}
        />
        {/* little houses on the ridge */}
        {[[120, 92], [150, 86], [232, 75], [300, 66], [330, 70]].map(([x, y], i) => (
          <motion.g key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.08 }}>
            <rect x={x} y={y} width="9" height="8" fill="#f5b800" opacity=".9" />
            <path d={`M${x - 1} ${y} l5.5 -5 l5.5 5z`} fill="#cf1f2b" />
          </motion.g>
        ))}
      </svg>

      {/* the flight path, drawn like a pen line */}
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <motion.path
          d="M-20 520 C 80 480, 120 300, 220 330 S 330 220, 430 170"
          fill="none" stroke="#f5b800" strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.6, ease: "easeInOut" }}
        />
      </svg>

      <motion.div
        className="absolute"
        initial={{ left: "-20%", top: "72%", rotate: -18 }}
        animate={{ left: ["-20%", "30%", "55%", "110%"], top: ["72%", "46%", "47%", "20%"], rotate: [-18, -8, -14, -26] }}
        transition={{ duration: 3, times: [0, 0.45, 0.65, 1], ease: "easeInOut" }}
        aria-hidden
      >
        <div className="relative">
          <svg width="74" height="52" viewBox="0 0 74 52">
            <path d="M2 26 L72 2 L46 50 L34 32 Z" fill="#f4faf6" />
            <path d="M34 32 L72 2 L28 30 Z" fill="#cfe5da" />
            <path d="M34 32 L38 46 L46 50 Z" fill="#a9cfc0" />
          </svg>
          <motion.span
            className="sign-type absolute left-16 top-9 whitespace-nowrap rounded-[6px] bg-nib px-3 pb-1 pt-1.5 text-[20px] text-on-nib"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}
          >
            {first}
          </motion.span>
        </div>
      </motion.div>

      <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 2.9, type: "spring", stiffness: 220, damping: 14 }}>
          <LogoMark size={76} tone="yellow" swing />
        </motion.div>
        <motion.h1
          className="sign-type mt-5 text-[46px]"
          initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 3.1 }}
        >
          So glad you&apos;re here, {first}
        </motion.h1>
        <motion.p
          className="mt-2 max-w-xs text-[17px] font-semibold text-nib"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5 }}
        >
          Every great idea starts on paper. We&apos;ll bring the paper.
        </motion.p>
      </div>

      <button onClick={onDone} className="press absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-white/12 px-4 py-2 text-sm font-semibold hover:bg-white/20">
        Skip
      </button>
    </motion.div>
  );
}
