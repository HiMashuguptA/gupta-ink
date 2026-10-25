import type { PetKind } from "./types";

/** Things that happen in the shop that the buddy reacts to. */
export type PetEvent =
  | { kind: "add"; name?: string }
  | { kind: "remove"; name?: string }
  | { kind: "love"; name?: string }
  | { kind: "unlove" }
  | { kind: "search"; q: string }
  | { kind: "typing"; len: number }
  | { kind: "checkout" }
  | { kind: "coupon" }
  | { kind: "order" }
  | { kind: "notify" }
  | { kind: "error" }
  | { kind: "lost" }
  | { kind: "hello"; name?: string };

export type Mood = "idle" | "happy" | "excited" | "love" | "curious" | "thinking" | "sad" | "surprised" | "sleepy" | "celebrate";

/** Fire-and-forget: anything in the app can tell the buddy what just happened. */
export function petSay(e: PetEvent) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ge:pet", { detail: e }));
}

export const PETS: { kind: PetKind; name: string; species: string; blurb: string }[] = [
  { kind: "mochi", name: "Mochi", species: "Cat", blurb: "Curious, a little dramatic, loves pens that click." },
  { kind: "pip", name: "Pip", species: "Pup", blurb: "Gets very excited about every single notebook." },
  { kind: "bun", name: "Bun", species: "Bunny", blurb: "Gentle and calm. Hops when you find a deal." },
  { kind: "hoot", name: "Hoot", species: "Owlet", blurb: "Wise about exams. Watches your orders all night." },
];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const short = (s?: string, n = 24) => (s ? (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s) : "");

/** What the buddy says and how it feels about each event. */
export function react(e: PetEvent, petName: string): { mood: Mood; line: string; ms?: number } {
  switch (e.kind) {
    case "add": return { mood: "excited", line: pick([e.name ? `In the bag: ${short(e.name)}!` : "In the bag!", "Ooh, good pick!", "Yesss, one more!", "That's going in the cart!"]) };
    case "remove": return { mood: "sad", line: pick(["Aww, back on the shelf.", "Okay… maybe next time.", "Bye bye, little thing."]) };
    case "love": return { mood: "love", line: pick(["Saved! I like it too.", "Ooh, a favourite!", "Into the wishlist it goes."]) };
    case "unlove": return { mood: "happy", line: "Removed from your wishlist." };
    case "search": return { mood: "thinking", line: `Sniffing out “${short(e.q)}”…`, ms: 2400 };
    case "typing": return { mood: "curious", line: "", ms: 1300 };
    case "checkout": return { mood: "happy", line: pick(["Almost there!", "Let's get these to you!", "Checkout time!"]) };
    case "coupon": return { mood: "excited", line: pick(["Ka-ching! Coupon applied.", "You just saved money!"]) };
    case "order": return { mood: "celebrate", line: pick(["Order placed! Woohoo!", "Yay! I'll watch the road for it.", "Done! It's on its way soon."]), ms: 3600 };
    case "notify": return { mood: "surprised", line: pick(["Ooh, news!", "Something new for you!", "Psst, a notification!"]) };
    case "error": return { mood: "sad", line: pick(["Uh oh, that didn't work.", "Hmm, let's try again."]) };
    case "lost": return { mood: "sad", line: "This aisle is empty… shall we go back?", ms: 4200 };
    case "hello": return { mood: "excited", line: `Hi! I'm ${e.name ?? petName}. Let's shop!`, ms: 3200 };
  }
}

export const TOUCH_LINES = ["Hehe, that tickles!", "Boop!", "Again! Again!", "You found me!", "I'm helping!", "Wheee!"];
export const PET_LINES = ["Purrr… so nice.", "More head pats please.", "Best human ever."];
export const IDLE_LINES = ["Need a new pen?", "Psst, check the offers!", "I'm right here if you need me.", "Exam season? I've got ideas."];
