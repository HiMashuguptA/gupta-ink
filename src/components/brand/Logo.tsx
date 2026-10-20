import { useId } from "react";
import clsx from "clsx";

type Props = {
  size?: number;
  animated?: boolean;
  wordmark?: boolean;
  className?: string;
  tone?: "ink" | "light";
};

/**
 * Gupta Ink mark: a "G" written as a single fountain-pen stroke whose crossbar
 * ends in a gold nib, set on an ink-blue tile with soft depth.
 */
export function LogoMark({ size = 40, animated = false, className }: { size?: number; animated?: boolean; className?: string }) {
  // Unique gradient ids: several logos can be on one page, some hidden by CSS
  const uid = useId().replace(/:/g, "");
  const tile = `gi-tile-${uid}`, nib = `gi-nib-${uid}`, gloss = `gi-gloss-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Gupta Ink"
      className={className}
    >
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#33409a" />
          <stop offset="1" stopColor="#141c4d" />
        </linearGradient>
        <linearGradient id={nib} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd98c" />
          <stop offset="0.55" stopColor="#e9a23b" />
          <stop offset="1" stopColor="#b9741c" />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* tile with depth */}
      <rect x="2" y="4" width="60" height="58" rx="16" fill="#0c1236" opacity=".35" />
      <rect x="2" y="2" width="60" height="58" rx="16" fill={`url(#${tile})`} />
      <path d="M2 18 a16 16 0 0 1 16 -16 h28 a16 16 0 0 1 16 16 v6 c-16 6 -44 6 -60 0z" fill={`url(#${gloss})`} />
      {/* stroke shadow */}
      <path
        d="M45.5 19.5 A15.5 15.5 0 1 0 47.5 35 H42"
        fill="none"
        stroke="#0c1236"
        strokeOpacity=".45"
        strokeWidth="6.5"
        strokeLinecap="round"
        transform="translate(0 1.6)"
      />
      {/* the G stroke */}
      <path
        d="M45.5 19.5 A15.5 15.5 0 1 0 47.5 35 H42"
        fill="none"
        stroke="#f6f7fb"
        strokeWidth="6.5"
        strokeLinecap="round"
        pathLength={1}
        className={clsx(animated && "ink-draw")}
      />
      {/* nib */}
      <g className={clsx(animated && "gi-nib-in")}>
        <path d="M25 35 L38 28 Q47 35 38 42 Z" fill={`url(#${nib})`} />
        <path d="M25.8 35 H37" stroke="#141c4d" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="38.4" cy="35" r="1.8" fill="#141c4d" />
        <path d="M31.5 31.2 l4.5 -2" stroke="#fff" strokeOpacity=".7" strokeWidth="1" strokeLinecap="round" className={clsx(animated && "gi-glint")} />
      </g>
      <style>{`
        .gi-nib-in { opacity: 1; }
        .ink-draw ~ .gi-nib-in { animation: gi-nib 0.5s 1.15s both cubic-bezier(.2,.9,.3,1.4); transform-origin: 36px 35px; }
        .gi-glint { animation: gi-glint 1.2s 1.7s both; }
        @keyframes gi-nib { from { opacity: 0; transform: translateX(6px) scale(.6); } to { opacity: 1; transform: none; } }
        @keyframes gi-glint { 0% { opacity: 0; } 40% { opacity: 1; } 100% { opacity: .7; } }
        @media (prefers-reduced-motion: reduce) { .gi-nib-in, .gi-glint { animation: none !important; } }
      `}</style>
    </svg>
  );
}

export function Logo({ size = 36, animated = false, wordmark = true, className, tone = "ink" }: Props) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} animated={animated} />
      {wordmark && (
        <span
          className={clsx(
            "font-display font-bold leading-none tracking-tight",
            tone === "ink" ? "text-ink-deep" : "text-white",
          )}
          style={{ fontSize: size * 0.56 }}
        >
          Gupta Ink
        </span>
      )}
    </span>
  );
}
