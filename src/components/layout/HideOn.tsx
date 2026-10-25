"use client";
import { usePathname } from "next/navigation";

/** Renders its children except on routes starting with one of `prefixes` (or only there, with `invert`). */
export function HideOn({ prefixes, children, invert = false }: { prefixes: string[]; children: React.ReactNode; invert?: boolean }) {
  const path = usePathname();
  const hit = prefixes.some((p) => path.startsWith(p));
  return hit !== invert ? null : <>{children}</>;
}
