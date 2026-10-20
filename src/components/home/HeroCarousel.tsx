"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { linkFor } from "@/lib/format";
import type { Banner } from "@/lib/types";

export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (banners.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (paused.current || !track.current) return;
      const next = (i + 1) % banners.length;
      track.current.scrollTo({ left: next * track.current.clientWidth, behavior: "smooth" });
    }, 4500);
    return () => clearInterval(t);
  }, [i, banners.length]);

  if (!banners.length) return null;

  return (
    <section className="mt-4 px-4" aria-roledescription="carousel" aria-label="Offers">
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setI(Math.round(el.scrollLeft / el.clientWidth));
        }}
        onPointerEnter={() => (paused.current = true)}
        onPointerLeave={() => (paused.current = false)}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-3xl"
      >
        {banners.map((b, k) => (
          <Link
            key={b.id}
            href={linkFor(b.link_type, b.link_value)}
            className="relative aspect-[2.1/1] w-full shrink-0 snap-center overflow-hidden sm:aspect-[3.2/1]"
            aria-roledescription="slide"
            aria-label={`${k + 1} of ${banners.length}: ${b.title ?? "Offer"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.image_url} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="relative flex h-full max-w-[62%] flex-col justify-center pl-[10%] text-white sm:max-w-[55%] sm:pl-[7%]">
              <h2 className="text-[clamp(1.25rem,4.6vw,2.4rem)] font-extrabold leading-[1.05]">{b.title}</h2>
              {b.subtitle && <p className="mt-1.5 text-[clamp(0.8rem,2.4vw,1.05rem)] text-white/85">{b.subtitle}</p>}
              <span className="mt-3 inline-flex w-fit rounded-full bg-nib px-3.5 py-1.5 text-xs font-bold text-ink-deep sm:text-sm">Shop now</span>
            </div>
          </Link>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {banners.map((b, k) => (
            <button
              key={b.id}
              onClick={() => track.current?.scrollTo({ left: k * track.current.clientWidth, behavior: "smooth" })}
              className={clsx("h-1.5 rounded-full transition-all", k === i ? "w-6 bg-ink" : "w-1.5 bg-rule")}
              aria-label={`Show offer ${k + 1}`}
              aria-current={k === i}
            />
          ))}
        </div>
      )}
    </section>
  );
}
