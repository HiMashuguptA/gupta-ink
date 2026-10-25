"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import clsx from "clsx";

/**
 * All photos of the chosen variant: swipe or use the thumbnails, tap to view full screen.
 * Children (badges, wishlist heart) sit on top of the main photo.
 */
export function ProductGallery({ images, alt, resetKey, children }: { images: string[]; alt: string; resetKey: string; children?: React.ReactNode }) {
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number; src: string } | null>(null);
  const pics = images.length ? images : ["/brand/logo.svg"];
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // New variant: start from its first photo
  useEffect(() => { setI(0); strip.current?.scrollTo({ left: 0 }); }, [resetKey]);

  const go = (n: number) => {
    const k = (n + pics.length) % pics.length;
    setI(k);
    const el = strip.current;
    if (el) el.scrollTo({ left: k * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = strip.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  };

  useEffect(() => {
    if (!zoom) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") setI((x) => (x + 1) % pics.length);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + pics.length) % pics.length);
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [zoom, pics.length]);

  return (
    <div>
      <div className="group relative aspect-square overflow-hidden rounded-[14px] bg-white"
        onPointerMove={(e) => {
          // Desktop magnifier (Aceternity "Lens"): mouse only, never on touch
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          setLens({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height, src: pics[i] });
        }}
        onPointerLeave={() => setLens(null)}>
        <div ref={strip} onScroll={onScroll} className="no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto" aria-roledescription="carousel" aria-label={`${alt} photos`}>
          {pics.map((src, k) => (
            <button key={src + k} type="button" onClick={() => { setI(k); setZoom(true); }} className="size-full shrink-0 snap-center cursor-zoom-in"
              aria-label={`Photo ${k + 1} of ${pics.length}, open full screen`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={k === 0 ? alt : `${alt}, photo ${k + 1}`} className="size-full object-cover" loading={k === 0 ? "eager" : "lazy"} draggable={false}
                style={k === 0 ? { viewTransitionName: "product-hero" } : undefined} />
            </button>
          ))}
        </div>
        {pics.length > 1 && (
          <>
            <button type="button" onClick={() => go(i - 1)} aria-label="Previous photo" className="press absolute left-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-card shadow-float md:group-hover:grid"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(i + 1)} aria-label="Next photo" className="press absolute right-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-card shadow-float md:group-hover:grid"><ChevronRight className="size-5" /></button>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
              {pics.map((_, k) => <span key={k} className={clsx("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-ink" : "w-1.5 bg-ink/30")} />)}
            </div>
          </>
        )}
        {lens && (
          <span aria-hidden className="pointer-events-none absolute hidden size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card shadow-float md:block"
            style={{ left: lens.x, top: lens.y, backgroundImage: `url(${lens.src})`, backgroundRepeat: "no-repeat",
              backgroundSize: "260%", backgroundPosition: `${(lens.x / lens.w) * 100}% ${(lens.y / lens.h) * 100}%` }} />
        )}
        {children}
      </div>

      {pics.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {pics.map((src, k) => (
            <button key={src + k} type="button" onClick={() => go(k)} aria-label={`Show photo ${k + 1}`} aria-current={k === i}
              className={clsx("press size-16 shrink-0 overflow-hidden rounded-[10px] border-2 bg-white transition-[border-color,opacity] duration-200", k === i ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {zoom && (
            <motion.div className="fixed inset-0 z-[80] flex flex-col bg-black/90" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              role="dialog" aria-modal="true" aria-label={`${alt}, photo ${i + 1} of ${pics.length}`} onClick={() => setZoom(false)}>
              <div className="flex items-center justify-between p-3 text-sm text-white/80">
                <span>{i + 1} / {pics.length}</span>
                <button type="button" onClick={() => setZoom(false)} className="grid size-10 place-items-center rounded-full bg-white/10 text-white" aria-label="Close"><X className="size-5" /></button>
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                <motion.img key={pics[i]} src={pics[i]} alt={alt} className="max-h-full max-w-full rounded-[10px] object-contain" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  drag={pics.length > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
                  onDragEnd={(_, info) => { if (info.offset.x < -60) setI((x) => (x + 1) % pics.length); else if (info.offset.x > 60) setI((x) => (x - 1 + pics.length) % pics.length); }} />
                {pics.length > 1 && (
                  <>
                    <button type="button" onClick={() => setI((x) => (x - 1 + pics.length) % pics.length)} className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/15 text-white" aria-label="Previous photo"><ChevronLeft className="size-6" /></button>
                    <button type="button" onClick={() => setI((x) => (x + 1) % pics.length)} className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/15 text-white" aria-label="Next photo"><ChevronRight className="size-6" /></button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
