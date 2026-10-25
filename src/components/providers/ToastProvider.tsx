"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, AlertCircle } from "lucide-react";

type Toast = { id: number; title: string; body?: string; kind: "ok" | "error" | "info" };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ y: -28, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.25 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.8, bottom: 0.1 }}
              onDragEnd={(_, i) => { if (i.offset.y < -30 || i.velocity.y < -300) setToasts((all) => all.filter((x) => x.id !== t.id)); }}
              className="pointer-events-auto flex w-full max-w-sm cursor-grab touch-none items-start gap-3 rounded-[14px] bg-[#0b1914] px-4 py-3 text-white shadow-float"
            >
              {t.kind === "ok" && <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#4cc98a]" />}
              {t.kind === "error" && <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#ff6b72]" />}
              {t.kind === "info" && (
                <motion.span animate={{ rotate: [0, -18, 14, -8, 0] }} transition={{ duration: 0.7 }} className="mt-0.5">
                  <Bell className="size-5 shrink-0 text-nib" />
                </motion.span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold">{t.title}</p>
                {t.body && <p className="text-sm text-white/70">{t.body}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
