"use client";
import { useEffect } from "react";
import { petSay, type PetEvent } from "@/lib/pet";

/** Drop into a server page to give the buddy something to react to when it opens. */
export function PetNudge({ kind }: { kind: "lost" | "order" | "checkout" }) {
  useEffect(() => {
    // Wait a beat so the buddy has mounted (it loads after the page)
    const t = setTimeout(() => petSay({ kind } as PetEvent), 900);
    return () => clearTimeout(t);
  }, [kind]);
  return null;
}
