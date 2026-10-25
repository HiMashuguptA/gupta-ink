"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const drag = useDragControls();
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-scrim sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%", transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
            drag="y" dragListener={false} dragControls={drag} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose(); }}
            className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-[20px] bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:rounded-[16px] sm:pt-5 ${wide ? "max-w-lg" : "max-w-md"}`}>
            {/* Drag the handle down to close (phones) */}
            <div onPointerDown={(e) => drag.start(e)} className="-mx-5 mb-1 flex cursor-grab touch-none justify-center pb-2 pt-1 sm:hidden" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-rule" />
            </div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[24px] uppercase">{title}</h2>
              <button onClick={onClose} className="press ml-auto grid size-9 place-items-center rounded-full bg-sunk hover:bg-ink-soft" aria-label="Close"><X className="size-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
