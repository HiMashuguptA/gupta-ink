"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";

// First-run screens (film, buddy picker, referral) only load for signed-in people, after the page
const OnboardingGate = dynamic(() => import("./OnboardingGate").then((m) => m.OnboardingGate), { ssr: false });

export function OnboardingLazy() {
  const { profile } = useSession();
  // The session can be known before hydration (cached); wait for mount so server and client match
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return profile ? <OnboardingGate /> : null;
}
