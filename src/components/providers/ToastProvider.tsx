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
              initial={{ y: -24, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-lg shadow-ink/10"
            >
              {t.kind === "ok" && <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" />}
              {t.kind === "error" && <AlertCircle className="mt-0.5 size-5 shrink-0 text-margin" />}
              {t.kind === "info" && (
                <motion.span animate={{ rotate: [0, -18, 14, -8, 0] }} transition={{ duration: 0.7 }} className="mt-0.5">
                  <Bell className="size-5 shrink-0 text-nib" />
                </motion.span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.body && <p className="text-sm text-muted">{t.body}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
