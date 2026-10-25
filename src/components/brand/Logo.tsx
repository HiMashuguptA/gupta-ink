import clsx from "clsx";

type Tone = "green" | "yellow";
const TONES: Record<Tone, { plate: string; trim: string; letter: string; string: string }> = {
  green: { plate: "#0b5a45", trim: "#f5b800", letter: "#ffffff", string: "#0b5a45" },
  yellow: { plate: "#f5b800", trim: "#0a4d3b", letter: "#0a4d3b", string: "#f5b800" },
};

/**
 * Gupta Enterprises mark: a little painted signboard hanging from a nail,
 * the way shop signs hang at Khedi Market. Condensed "GE" in sign lettering inside a trimmed plate.
 */
export function LogoMark({ size = 40, tone = "green", swing = false, className }: { size?: number; tone?: Tone; swing?: boolean; className?: string }) {
  const c = TONES[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Gupta Enterprises" className={clsx("shrink-0 overflow-visible", className)}>
      <path d="M15 17 L32 5 L49 17" fill="none" stroke={c.string} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="5" r="3" fill={c.trim} stroke={c.string} strokeWidth="1.5" />
      <g className={clsx(swing && "logo-swing")} style={{ transformOrigin: "32px 5px" }}>
        <rect x="5" y="16" width="54" height="44" rx="9" fill={c.plate} />
        <rect x="9.5" y="20.5" width="45" height="35" rx="5.5" fill="none" stroke={c.trim} strokeWidth="2.2" />
        <path d="M29.5 30.2 C29.3 27.9 27.7 26.6 25.4 26.6 H23.3 C20.6 26.6 18.9 28.3 18.9 31 V44.9 C18.9 47.6 20.6 49.3 23.3 49.3 H25.4 C28 49.3 29.6 47.6 29.6 44.9 V39.3 H24.6"
          fill="none" stroke={c.letter} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M45.4 26.8 H35.6 V49.1 H45.4 M35.6 37.9 H43.2" fill="none" stroke={c.letter} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {swing && (
        <style>{`
          .logo-swing { animation: logo-swing 1.6s cubic-bezier(.2,.9,.3,1) both; }
          @keyframes logo-swing { 0% { transform: rotate(-14deg); } 35% { transform: rotate(8deg); } 60% { transform: rotate(-4deg); } 80% { transform: rotate(1.5deg); } 100% { transform: rotate(0); } }
          @media (prefers-reduced-motion: reduce) { .logo-swing { animation: none; } }
        `}</style>
      )}
    </svg>
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
