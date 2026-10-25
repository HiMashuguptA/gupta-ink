"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import { linkFor } from "@/lib/format";
import type { Banner } from "@/lib/types";

// Each offer is painted on its own board colour, like the shop signs at Khedi Market
const BOARDS = [
  { bg: "bg-sign", title: "text-on-sign", sub: "text-on-sign-muted", cta: "bg-nib text-on-nib", shade: "#04261d", keyline: "rgb(245 184 0 / 0.55)" },
  { bg: "bg-[#cf1f2b]", title: "text-white", sub: "text-white/85", cta: "bg-white text-[#a3141e]", shade: "#7d0d15", keyline: "rgb(255 255 255 / 0.45)" },
  { bg: "bg-nib", title: "text-on-nib", sub: "text-on-nib/75", cta: "bg-sign text-on-sign", shade: "#fff4cf", keyline: "rgb(10 77 59 / 0.45)" },
];

/**
 * Offer boards as a swipeable deck (after Skiper's "Card swipe carousel"):
 * flick the front board away and the next one steps forward. Advances on its own every few seconds
 * unless you're touching it, the tab is hidden, or reduced motion is on.
 */
export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-7, 0, 7]);
  const held = useRef(false);
  const dragged = useRef(false);
  const n = banners.length;

  const go = (dir: 1 | -1) => {
    if (n < 2) return;
    if (reduce) { setI((v) => (v + dir + n) % n); return; }
    void animate(x, dir * 420, { duration: 0.28, ease: [0.23, 1, 0.32, 1] }).then(() => { setI((v) => (v + dir + n) % n); x.set(0); });
  };

  useEffect(() => {
    if (n < 2 || reduce) return;
    const t = setInterval(() => { if (!held.current && document.visibilityState === "visible") go(1); }, 5200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, reduce]);

  if (!n) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    held.current = false;
    if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 550) go(info.offset.x < 0 ? 1 : -1);
    else void animate(x, 0, { type: "spring", duration: 0.4, bounce: 0.25 });
  };

  return (
    <section className="mt-4 px-4" aria-roledescription="carousel" aria-label="Offers">
      <div className="relative aspect-[1.55/1] sm:aspect-[3/1]" onPointerEnter={() => (held.current = true)} onPointerLeave={() => (held.current = false)}>
        {[2, 1, 0].filter((d) => d < n).map((depth) => {
          const k = (i + depth) % n;
          const b = banners[k];
          const tone = BOARDS[k % BOARDS.length];
          const top = depth === 0;
          return (
            <motion.div key={b.id}
              className={clsx("keyline absolute inset-0 overflow-hidden rounded-[14px]", tone.bg, top ? "z-30 cursor-grab touch-pan-y active:cursor-grabbing" : depth === 1 ? "z-20" : "z-10")}
              initial={false}
              animate={{ scale: 1 - depth * 0.05, y: depth * 10, opacity: depth === 2 ? 0.6 : 1 }}
              transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.5, bounce: 0.2 }}
              style={{ ...(top ? { x, rotate } : {}), transformOrigin: "50% 100%", "--keyline": tone.keyline, "--shade": tone.shade } as React.CSSProperties}
              drag={top && n > 1 ? "x" : false} dragElastic={0.7} dragConstraints={{ left: 0, right: 0 }} dragMomentum={false}
              onDragStart={() => { held.current = true; dragged.current = true; }} onDragEnd={onDragEnd}
              aria-hidden={!top} aria-roledescription="slide" aria-label={`${k + 1} of ${n}: ${b.title ?? "Offer"}`}>
              <Link href={linkFor(b.link_type, b.link_value)} tabIndex={top ? 0 : -1} draggable={false}
                onClick={(e) => { if (dragged.current) { e.preventDefault(); dragged.current = false; } }}
                onPointerDown={() => (dragged.current = false)}
                className="flex size-full items-stretch">
                <div className="relative z-10 flex min-w-0 flex-[1.15] flex-col justify-center py-4 pl-5 pr-2 sm:pl-10">
                  <h2 className={clsx("sign-type sign-shade text-[clamp(1.65rem,7.6vw,4.2rem)] [overflow-wrap:anywhere]", tone.title)}>{b.title}</h2>
                  {b.subtitle && <p className={clsx("mt-1.5 line-clamp-2 max-w-[34ch] text-[clamp(0.78rem,3.2vw,1rem)] leading-snug", tone.sub)}>{b.subtitle}</p>}
                  <span className={clsx("mt-3 inline-flex h-9 w-fit items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] font-bold", tone.cta)}>
                    Shop now <ArrowRight className="size-4" />
                  </span>
                </div>
                <div className="relative flex-1 sm:flex-[1.3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_url} alt="" draggable={false} className="absolute inset-0 size-full object-contain object-right p-3 pb-5 sm:scale-110 sm:object-center" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
      {n > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5" role="group" aria-label="Choose offer">
          {banners.map((b, k) => (
            <button key={b.id} onClick={() => setI(k)} aria-label={`Show offer ${k + 1}`} aria-current={k === i}
              className="press grid h-6 place-items-center px-0.5">
              <span className={clsx("block h-1.5 rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-out)]", k === i ? "w-6 bg-ink" : "w-1.5 bg-rule")} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
