import clsx from "clsx";

type Props = {
  size?: number;
  animated?: boolean;
  wordmark?: boolean | "responsive";
  className?: string;
  tone?: "ink" | "light";
};

/**
 * Gupta Enterprises mark: a geometric "GE" monogram on an ink-blue tile.
 * The G's crossbar and the E's middle bar are one gold stroke, tying the two letters together.
 */
export function LogoMark({ size = 40, animated = false, className }: { size?: number; animated?: boolean; className?: string }) {
  // Fixed gradient id; never hide a LogoMark with display:none (its gradient would stop rendering for other copies).
  const tile = "ge-tile";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Gupta Enterprises" className={clsx("shrink-0", className)}>
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3a9e" />
          <stop offset="1" stopColor="#111847" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${tile})`} />
      <rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="2" />
      <path d="M33.6 21.6 A12 12 0 1 0 36.6 32" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round"
        pathLength={1} className={clsx(animated && "ge-draw")} />
      <path d="M41.5 20.5 V43.5 M41.5 20.5 H51 M41.5 43.5 H51" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} className={clsx(animated && "ge-draw ge-late")} />
      <path d="M27 32 H49" stroke="#eaa53a" strokeWidth="6" strokeLinecap="round" className={clsx(animated && "ge-bar")} />
      {animated && (
        <style>{`
          .ge-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: ge-draw .7s .1s forwards cubic-bezier(.6,0,.2,1); }
          .ge-late { animation-delay: .45s; }
          .ge-bar { transform-origin: 27px 32px; transform: scaleX(0); animation: ge-bar .45s .95s forwards cubic-bezier(.2,.9,.3,1.2); }
          @keyframes ge-draw { to { stroke-dashoffset: 0; } }
          @keyframes ge-bar { to { transform: scaleX(1); } }
          @media (prefers-reduced-motion: reduce) { .ge-draw, .ge-bar { animation: none !important; stroke-dashoffset: 0; transform: none; } }
        `}</style>
      )}
    </svg>
  );
}

/** Mark plus a two-line wordmark: "Gupta" over a tracked "ENTERPRISES". */
export function Logo({ size = 36, animated = false, wordmark = true, className, tone = "ink" }: Props) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} animated={animated} />
      {wordmark && (
        <span className={clsx("flex flex-col leading-none", wordmark === "responsive" && "hidden sm:flex")}>
          <span className={clsx("font-display font-extrabold tracking-tight", tone === "ink" ? "text-ink-deep" : "text-white")} style={{ fontSize: size * 0.5 }}>
            Gupta
          </span>
          <span className={clsx("mt-[0.18em] font-semibold uppercase", tone === "ink" ? "text-muted" : "text-white/70")}
            style={{ fontSize: Math.max(8, size * 0.24), letterSpacing: "0.2em" }}>
            Enterprises
          </span>
        </span>
      )}
    </span>
  );
}
