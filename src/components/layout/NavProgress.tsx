"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Call before router.push() so the bar starts immediately for programmatic navigation. */
export function startNav() {
  window.dispatchEvent(new Event("gi:navstart"));
}

/**
 * A thin ink-coloured bar at the top that starts the moment a link is tapped,
 * before the server responds, and completes when the new page renders.
 */
export function NavProgress() {
  const path = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [width, setWidth] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const key = path + "?" + params.toString();
  const lastKey = useRef(key);

  useEffect(() => {
    const start = () => {
      if (timer.current) clearInterval(timer.current);
      setState("loading");
      setWidth(12);
      // Trickle toward 90% while we wait
      timer.current = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.12 : w)), 180);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("gi:navstart", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("gi:navstart", start);
    };
  }, []);

  // The route changed: finish the bar
  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (timer.current) clearInterval(timer.current);
    setWidth(100);
    setState("done");
    const t = setTimeout(() => { setState("idle"); setWidth(0); }, 320);
    return () => clearTimeout(t);
  }, [key]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]">
      <div
        className="relative h-full bg-nib shadow-[0_0_8px_var(--nib)]"
        style={{
          width: `${width}%`,
          opacity: state === "idle" ? 0 : 1,
          transition: state === "done" ? "width 200ms ease-out, opacity 300ms 150ms" : "width 180ms linear",
        }}
      >
        {/* a little pencil writes the bar across */}
        <svg viewBox="0 0 22 12" className="nav-pencil">
          <path d="M0 2.5h15l5 3.5-5 3.5H0z" fill="#f5b800" stroke="#0a2e24" strokeWidth="1" strokeLinejoin="round" />
          <path d="M15 2.5l5 3.5-5 3.5z" fill="#f3d9b1" stroke="#0a2e24" strokeWidth="1" strokeLinejoin="round" />
          <path d="M18.2 4.7 20 6l-1.8 1.3z" fill="#0a2e24" />
          <rect x="0" y="2.5" width="3" height="7" fill="#e8394b" stroke="#0a2e24" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
