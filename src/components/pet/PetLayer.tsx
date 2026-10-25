"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { PETS } from "@/lib/pet";

// The buddy is decoration: load it after the page, never on the server
const Pet = dynamic(() => import("./Pet").then((m) => m.Pet), { ssr: false });

export function PetLayer() {
  const { profile } = useSession();
  // The session can be known before hydration (cached); wait for mount so server and client match
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (!profile?.pet || profile.pet_hidden) return null;
  const name = profile.pet_name || PETS.find((p) => p.kind === profile.pet)?.name || "Buddy";
  return <Pet kind={profile.pet} name={name} />;
}
