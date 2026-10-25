"use client";
import { motion, type MotionValue } from "framer-motion";
import type { PetKind } from "@/lib/types";
import type { Mood } from "@/lib/pet";

type Palette = { body: string; belly: string; dark: string; ear: string; cheek: string; line: string };
const PAL: Record<PetKind, Palette> = {
  mochi: { body: "#f2b866", belly: "#fde7c2", dark: "#d38a37", ear: "#f7a3a8", cheek: "#ff8f9a", line: "#3a2414" },
  pip: { body: "#c98b55", belly: "#f3dcc2", dark: "#7e4a26", ear: "#7e4a26", cheek: "#ff9a8f", line: "#2e1a0c" },
  bun: { body: "#f6f3ee", belly: "#ffffff", dark: "#d9d2c8", ear: "#f6a8bd", cheek: "#ff9fb4", line: "#3a3035" },
  hoot: { body: "#13795c", belly: "#f5c430", dark: "#0a4d3b", ear: "#0a4d3b", cheek: "#ff9f8a", line: "#0b1914" },
};

/**
 * The buddy, drawn in SVG. One face rig shared by all four animals:
 * eyes that look where you point, eyelids that blink, and a mouth and brows per mood.
 */
export function PetArt({ kind, mood, blink, lookX, lookY, size = 64 }: {
  kind: PetKind; mood: Mood; blink: boolean; lookX?: MotionValue<number>; lookY?: MotionValue<number>; size?: number;
}) {
  const c = PAL[kind];
  const closed = blink || mood === "sleepy";
  const happyEyes = mood === "happy" || mood === "excited" || mood === "celebrate";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className="overflow-visible">
      {/* tail */}
      {kind === "mochi" && <path className="pet-tail" d="M74 74 C92 72 94 54 84 48" fill="none" stroke={c.body} strokeWidth="7" strokeLinecap="round" />}
      {kind === "pip" && <path className="pet-tail" d="M75 72 C86 70 90 62 88 56" fill="none" stroke={c.dark} strokeWidth="6" strokeLinecap="round" />}
      {kind === "bun" && <circle className="pet-tail" cx="77" cy="76" r="6.5" fill="#fff" stroke={c.dark} strokeWidth="1.2" />}
      {kind === "hoot" && <path d="M70 84 l8 4 l-2 -8 z" fill={c.dark} />}

      {/* ears (behind head) */}
      {kind === "mochi" && (<g><path d="M28 34 L30 12 L46 26 Z" fill={c.body} /><path d="M32 29 L33 17 L42 25 Z" fill={c.ear} /><path d="M72 34 L70 12 L54 26 Z" fill={c.body} /><path d="M68 29 L67 17 L58 25 Z" fill={c.ear} /></g>)}
      {kind === "bun" && (<g className="pet-ears"><path d="M36 30 C30 4 40 2 43 26 Z" fill={c.body} stroke={c.dark} strokeWidth="1" /><path d="M37 26 C34 10 39 9 41 25 Z" fill={c.ear} /><path d="M64 30 C70 4 60 2 57 26 Z" fill={c.body} stroke={c.dark} strokeWidth="1" /><path d="M63 26 C66 10 61 9 59 25 Z" fill={c.ear} /></g>)}
      {kind === "hoot" && (<g><path d="M28 32 L26 16 L40 26 Z" fill={c.dark} /><path d="M72 32 L74 16 L60 26 Z" fill={c.dark} /></g>)}

      {/* body + head (one round shape) */}
      <ellipse cx="50" cy="58" rx="30" ry="29" fill={c.body} stroke={kind === "bun" ? c.dark : "none"} strokeWidth="1.2" />
      <ellipse cx="50" cy="70" rx="17" ry="14" fill={c.belly} />
      {kind === "hoot" && (<g opacity=".55">{[0, 1, 2].map((i) => <path key={i} d={`M${43 + i * 7} ${66 + (i % 2) * 4} q3 3 6 0`} fill="none" stroke={c.dark} strokeWidth="1.4" strokeLinecap="round" />)}</g>)}
      {kind === "mochi" && (<g stroke={c.dark} strokeWidth="2.4" strokeLinecap="round"><path d="M44 31 v6" /><path d="M50 30 v7" /><path d="M56 31 v6" /></g>)}
      {kind === "pip" && <ellipse cx="38" cy="47" rx="9" ry="8" fill={c.dark} opacity=".35" />}

      {/* floppy ears in front for the pup */}
      {kind === "pip" && (<g className="pet-ears"><path d="M24 40 C14 46 16 66 26 64 C30 56 32 46 30 38 Z" fill={c.ear} /><path d="M76 40 C86 46 84 66 74 64 C70 56 68 46 70 38 Z" fill={c.ear} /></g>)}

      {/* paws */}
      <ellipse cx="38" cy="85" rx="7" ry="4.5" fill={c.dark} opacity={kind === "bun" ? 0.4 : 0.9} />
      <ellipse cx="62" cy="85" rx="7" ry="4.5" fill={c.dark} opacity={kind === "bun" ? 0.4 : 0.9} />

      {/* cheeks */}
      <ellipse cx="33" cy="57" rx="5" ry="3.2" fill={c.cheek} opacity={mood === "love" || happyEyes ? 0.75 : 0.4} />
      <ellipse cx="67" cy="57" rx="5" ry="3.2" fill={c.cheek} opacity={mood === "love" || happyEyes ? 0.75 : 0.4} />

      {/* eyes */}
      <Eyes c={c} mood={mood} closed={closed} happyEyes={happyEyes} lookX={lookX} lookY={lookY} owl={kind === "hoot"} />

      {/* brows for strong moods */}
      {mood === "sad" && (<g stroke={c.line} strokeWidth="2" strokeLinecap="round"><path d="M34 39 l8 3" /><path d="M66 39 l-8 3" /></g>)}
      {mood === "curious" && <path d="M58 38 q5 -3 9 0" stroke={c.line} strokeWidth="2" fill="none" strokeLinecap="round" />}
      {mood === "thinking" && <path d="M33 40 q5 -3 9 0" stroke={c.line} strokeWidth="2" fill="none" strokeLinecap="round" />}

      {/* nose + mouth (beak for the owlet) */}
      {kind === "hoot" ? (
        <path d={mood === "surprised" ? "M46 54 L54 54 L50 62 Z" : "M46 53 L54 53 L50 59 Z"} fill="#f08a24" />
      ) : (
        <>
          <ellipse cx="50" cy="53" rx={kind === "pip" ? 3.6 : 2.4} ry={kind === "pip" ? 2.6 : 1.8} fill={kind === "bun" ? "#f08aa3" : c.line} />
          <Mouth mood={mood} color={c.line} />
        </>
      )}
      {kind === "mochi" && (<g stroke={c.line} strokeWidth="1.1" opacity=".55" strokeLinecap="round"><path d="M28 54 h-9" /><path d="M28 58 l-8 2" /><path d="M72 54 h9" /><path d="M72 58 l8 2" /></g>)}
    </svg>
  );
}

function Eyes({ c, mood, closed, happyEyes, lookX, lookY, owl }: {
  c: Palette; mood: Mood; closed: boolean; happyEyes: boolean; lookX?: MotionValue<number>; lookY?: MotionValue<number>; owl: boolean;
}) {
  const L = 39, R = 61, Y = 46;
  if (mood === "love") {
    const heart = (x: number) => <path key={x} d={`M${x} ${Y + 4} l-5.5 -5.5 a3.2 3.2 0 0 1 5.5 -3.5 a3.2 3.2 0 0 1 5.5 3.5 z`} fill="#e8394b" />;
    return <g className="pet-pulse">{heart(L)}{heart(R)}</g>;
  }
  if (closed) return <g stroke={c.line} strokeWidth="2.4" strokeLinecap="round" fill="none"><path d={`M${L - 5} ${Y} q5 3 10 0`} /><path d={`M${R - 5} ${Y} q5 3 10 0`} /></g>;
  if (happyEyes) return <g stroke={c.line} strokeWidth="2.6" strokeLinecap="round" fill="none"><path d={`M${L - 5} ${Y + 2} q5 -6 10 0`} /><path d={`M${R - 5} ${Y + 2} q5 -6 10 0`} /></g>;
  const r = mood === "surprised" ? 7.5 : owl ? 8 : 6.2;
  return (
    <g>
      {owl && (<><circle cx={L} cy={Y} r="10.5" fill="#fff6d6" /><circle cx={R} cy={Y} r="10.5" fill="#fff6d6" /></>)}
      <motion.g style={{ x: lookX, y: lookY }}>
        <ellipse cx={L} cy={Y} rx={r * 0.82} ry={r} fill={c.line} />
        <ellipse cx={R} cy={Y} rx={r * 0.82} ry={r} fill={c.line} />
        <circle cx={L + 1.8} cy={Y - 2.4} r={r * 0.32} fill="#fff" />
        <circle cx={R + 1.8} cy={Y - 2.4} r={r * 0.32} fill="#fff" />
        <circle cx={L - 1.6} cy={Y + 2} r={r * 0.14} fill="#fff" opacity=".8" />
        <circle cx={R - 1.6} cy={Y + 2} r={r * 0.14} fill="#fff" opacity=".8" />
      </motion.g>
      {mood === "sad" && (<g fill={c.body}><rect x={L - 8} y={Y - 9} width="16" height="6" /><rect x={R - 8} y={Y - 9} width="16" height="6" /></g>)}
    </g>
  );
}

function Mouth({ mood, color }: { mood: Mood; color: string }) {
  const s = { stroke: color, strokeWidth: 2.2, strokeLinecap: "round" as const, fill: "none" };
  switch (mood) {
    case "excited": case "celebrate":
      return <path d="M43 57 q7 10 14 0 z" fill="#e8394b" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />;
    case "happy": case "love":
      return <path d="M44 57 q3 4 6 0 q3 4 6 0" {...s} />;
    case "sad":
      return <path d="M45 61 q5 -5 10 0" {...s} />;
    case "surprised":
      return <ellipse cx="50" cy="60" rx="3.4" ry="4.2" fill={color} />;
    case "curious": case "thinking":
      return <path d="M46 59 h7" {...s} />;
    case "sleepy":
      return <ellipse cx="50" cy="59" rx="2.2" ry="1.6" fill={color} />;
    default:
      return <path d="M45 57 q2.5 3 5 0 q2.5 3 5 0" {...s} />;
  }
}
