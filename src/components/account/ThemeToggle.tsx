"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Monitor, Sun, Moon } from "lucide-react";
import clsx from "clsx";

type Mode = "system" | "light" | "dark";
const OPTS: { key: Mode; label: string; icon: typeof Sun }[] = [
  { key: "system", label: "Auto", icon: Monitor },
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
];

/**
 * Light / dark / follow the phone. The new theme spreads out in a circle from the button you
 * tapped (Skiper "Theme toggle", using the View Transitions API where the browser has it).
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try { const t = localStorage.getItem("ge-theme"); if (t === "light" || t === "dark") setMode(t); } catch {}
  }, []);

  const apply = (next: Mode, e: React.MouseEvent) => {
    const set = () => {
      setMode(next);
      const root = document.documentElement;
      if (next === "system") { delete root.dataset.theme; try { localStorage.removeItem("ge-theme"); } catch {} }
      else { root.dataset.theme = next; try { localStorage.setItem("ge-theme", next); } catch {} }
    };
    const d = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!d.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return set();
    const x = e.clientX, y = e.clientY;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.classList.add("theme-vt");
    const vt = d.startViewTransition(set);
    void vt.ready.then(() => {
      document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(0.23, 1, 0.32, 1)", pseudoElement: "::view-transition-new(root)" })
        .finished.finally(() => document.documentElement.classList.remove("theme-vt"));
    });
  };

  return (
    <div className="grid grid-cols-3 gap-1 rounded-[12px] bg-card p-1" role="radiogroup" aria-label="Appearance">
      {OPTS.map(({ key, label, icon: Icon }) => (
        <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={(e) => apply(key, e)}
          className={clsx("press relative flex h-10 items-center justify-center gap-1.5 rounded-[9px] text-sm font-semibold", mode === key ? "text-on-sign" : "text-muted hover:text-graphite")}>
          {mode === key && <motion.span layoutId="theme-pill" className="absolute inset-0 rounded-[9px] bg-sign" transition={{ type: "spring", duration: 0.4, bounce: 0.2 }} />}
          <Icon className="relative size-4" /> <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}
