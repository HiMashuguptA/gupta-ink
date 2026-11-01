import clsx from "clsx";

type Tone = "green" | "yellow";
const STRING: Record<Tone, string> = { green: "#0b5a45", yellow: "#f5b800" };

/**
 * Gupta Enterprises mark (the GE monogram with its two swooshes) on a white plate.
 * It hangs from a nail on two strings, the way shop signs hang at Khedi Market.
 */
export function LogoMark({ size = 40, tone = "green", swing = false, className }: { size?: number; tone?: Tone; swing?: boolean; className?: string }) {
  const s = STRING[tone];
  return (
    <span role="img" aria-label="Gupta Enterprises" className={clsx("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="absolute inset-0 overflow-visible">
        <path d="M15 17 L32 5 L49 17" fill="none" stroke={s} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="5" r="3" fill={tone === "green" ? "#f5b800" : "#0a4d3b"} stroke={s} strokeWidth="1.5" />
      </svg>
      <span className={clsx("absolute block overflow-hidden bg-white shadow-[0_1px_2px_rgb(0_0_0/0.18)]", swing && "logo-swing")}
        style={{ left: size * 0.02, right: size * 0.02, top: size * 0.24, bottom: size * 0.02, borderRadius: size * 0.13, transformOrigin: `50% ${-size * 0.17}px` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/ge-mark.svg" alt="" width={size} height={size} draggable={false}
          className="absolute inset-0 m-auto h-[96%] w-[96%] object-contain" />
      </span>
      {swing && (
        <style>{`
          .logo-swing { animation: logo-swing 1.6s cubic-bezier(.2,.9,.3,1) both; }
          @keyframes logo-swing { 0% { transform: rotate(-14deg); } 35% { transform: rotate(8deg); } 60% { transform: rotate(-4deg); } 80% { transform: rotate(1.5deg); } 100% { transform: rotate(0); } }
          @media (prefers-reduced-motion: reduce) { .logo-swing { animation: none; } }
        `}</style>
      )}
    </span>
  );
}

/** Mark plus wordmark: GUPTA in sign lettering over "Enterprises". */
export function Logo({
  size = 36, wordmark = true, className, tone = "ink", swing = false,
}: { size?: number; wordmark?: boolean | "responsive"; className?: string; tone?: "ink" | "sign"; swing?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} tone={tone === "sign" ? "yellow" : "green"} swing={swing} />
      {wordmark && (
        <span className={clsx("flex flex-col leading-none", wordmark === "responsive" && "hidden min-[480px]:flex")}>
          <span className={clsx("sign-type", tone === "sign" ? "text-on-sign" : "text-ink")} style={{ fontSize: size * 0.62 }}>
            Gupta
          </span>
          <span className={clsx("font-semibold", tone === "sign" ? "text-on-sign-muted" : "text-muted")} style={{ fontSize: Math.max(10, size * 0.3), marginTop: size * 0.04 }}>
            Enterprises
          </span>
        </span>
      )}
    </span>
  );
}
