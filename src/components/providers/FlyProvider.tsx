"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Flight = { id: number; src: string; from: DOMRect; to: DOMRect };
const FlyCtx = createContext<(src: string, from: DOMRect) => void>(() => {});

/** Animates a product thumbnail from where it was tapped into the cart icon. */
export function FlyProvider({ children }: { children: React.ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([]);

  const fly = useCallback((src: string, from: DOMRect) => {
    const target = ([...document.querySelectorAll("[data-cart-target]")] as HTMLElement[]).find((el) => el.offsetParent !== null) ?? null;
    if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      target?.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 350 });
      return;
    }
    const to = target.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setFlights((f) => [...f, { id, src, from, to }]);
    setTimeout(() => {
      setFlights((f) => f.filter((x) => x.id !== id));
      target.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.2) rotate(-6deg)" }, { transform: "scale(1)" }],
        { duration: 380, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
      );
    }, 620);
  }, []);

  return (
    <FlyCtx.Provider value={fly}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden>
        <AnimatePresence>
          {flights.map((f) => {
            const size = Math.min(f.from.width, 72);
            const sx = f.from.left + f.from.width / 2 - size / 2;
            const sy = f.from.top + f.from.height / 2 - size / 2;
            const tx = f.to.left + f.to.width / 2 - size / 2;
            const ty = f.to.top + f.to.height / 2 - size / 2;
            return (
              <motion.img
                key={f.id}
                src={f.src}
                alt=""
                className="absolute rounded-[10px] shadow-float"
                style={{ width: size, height: size, left: 0, top: 0 }}
                initial={{ x: sx, y: sy, scale: 1, opacity: 1 }}
                animate={{ x: [sx, (sx + tx) / 2, tx], y: [sy, Math.min(sy, ty) - 80, ty], scale: [1, 0.8, 0.25], opacity: [1, 1, 0.6] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.62, ease: [0.4, 0, 0.2, 1] }}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </FlyCtx.Provider>
  );
}

export const useFly = () => useContext(FlyCtx);
