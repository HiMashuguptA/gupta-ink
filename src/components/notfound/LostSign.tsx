import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import type { Category } from "@/lib/types";

/** 404: the shop's sign swings on its nail and reads "404, aisle not found". */
export function LostSign({ categories, compact = false }: { categories: Category[]; compact?: boolean }) {
  return (
    <section className={compact ? "px-4 pt-6" : "flex min-h-dvh flex-col items-center justify-center bg-sign px-6 py-12 text-on-sign"}>
      <div className={compact ? "keyline relative mx-auto max-w-xl rounded-[16px] bg-sign px-6 py-10 text-center text-on-sign" : "w-full max-w-xl text-center"}
        style={{ "--keyline": "rgb(245 184 0 / 0.5)", "--shade": "#7d0d15" } as React.CSSProperties}>
        <div className="lost-swing relative mx-auto w-[min(78vw,340px)]" aria-hidden>
          <svg viewBox="0 0 340 70" className="block w-full">
            <path d="M40 70 L170 8 L300 70" fill="none" stroke="#a9cfc0" strokeWidth="3" strokeLinecap="round" />
            <circle cx="170" cy="8" r="6" fill="#f5b800" />
          </svg>
          <div className="-mt-1 rounded-[14px] bg-[#cf1f2b] p-2.5 shadow-[0_10px_24px_-8px_rgb(0_0_0/0.45)]">
            <div className="rounded-[9px] border-[3px] border-white/60 px-4 py-5">
              <p className="sign-type sign-shade text-[clamp(4.5rem,24vw,8rem)] leading-[0.9] text-white">404</p>
              <p className="sign-type mt-1 text-[clamp(1.2rem,5vw,1.6rem)] text-white">Aisle not found</p>
            </div>
          </div>
        </div>
        <h1 className="sign-type mt-8 text-[clamp(1.8rem,7vw,2.6rem)] text-on-sign">This shelf is empty</h1>
        <p className="mx-auto mt-2 max-w-sm text-on-sign-muted">The page may have moved or the link is mistyped. Everything else is still on the shelves.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link href="/" className="sign-type press inline-flex h-12 items-center gap-2 rounded-[10px] bg-nib px-5 text-[19px] text-on-nib hover:bg-nib-deep"><ArrowLeft className="size-5" /> Back to the shop</Link>
          <Link href="/search?q=pen" className="press inline-flex h-12 items-center gap-2 rounded-[10px] bg-white/10 px-5 font-semibold text-on-sign hover:bg-white/20"><Search className="size-4" /> Search products</Link>
        </div>
        {categories.length > 0 && (
          <nav className="mt-8" aria-label="Popular aisles">
            <p className="text-sm text-on-sign-muted">Or try an aisle</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
              {categories.slice(0, 8).map((c) => (
                <li key={c.id}><Link href={`/c/${c.slug}`} className="press inline-flex h-9 items-center rounded-[9px] bg-white/10 px-3 text-sm font-semibold text-on-sign hover:bg-white/20">{c.name}</Link></li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      <style>{`
        .lost-swing { transform-origin: 50% 8px; animation: lost-swing 2.4s cubic-bezier(.22,1,.36,1) both; }
        @keyframes lost-swing { 0% { transform: rotate(-16deg); } 25% { transform: rotate(10deg); } 45% { transform: rotate(-6deg); } 65% { transform: rotate(3deg); } 82% { transform: rotate(-1.2deg); } 100% { transform: rotate(0); } }
        @media (prefers-reduced-motion: reduce) { .lost-swing { animation: none; } }
      `}</style>
    </section>
  );
}
