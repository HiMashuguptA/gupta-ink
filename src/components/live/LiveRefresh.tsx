"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLive, type LiveSpec } from "@/lib/live";

/**
 * Drop into any server-rendered page: it re-renders the page when the watched data changes.
 * Pass `at={Date.now()}` from the server: if the browser showed a kept copy of the page
 * (back button, tab bar, prefetch) that is more than a few seconds old, it refreshes once.
 */
export function LiveRefresh({ id, watch, waitMs, at }: { id: string; watch: LiveSpec[]; waitMs?: number; at?: number }) {
  const router = useRouter();
  useLive(id, watch, () => router.refresh(), { waitMs });
  useEffect(() => {
    if (at && Date.now() - at > 8000) router.refresh();
  }, [at, router]);
  return null;
}
