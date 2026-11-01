"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export type SessionUser = { id: string; email: string | null };

type Ctx = { user: SessionUser | null; profile: Profile | null; ready: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> };
const SessionCtx = createContext<Ctx>({ user: null, profile: null, ready: false, refresh: async () => {}, signOut: async () => {} });

/**
 * Who is signed in, for the browser. Clerk knows whether someone is signed in; the profile
 * (role, coins, buddy...) comes from the database, which creates it on the first visit.
 * Shop pages are cached for everyone, so this fills sign-in info in right after load.
 */
export function SessionProvider({ initialUser, initialProfile, children }: { initialUser: SessionUser | null; initialProfile: Profile | null; children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const clerk = useClerk();
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  const [ready, setReady] = useState(!!initialUser);
  const sb = supabaseBrowser();
  const last = useRef<string | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!isSignedIn) { setUser(null); setProfile(null); setReady(true); return; }
    const { data } = await sb.rpc("ensure_profile");
    const p = (data as unknown as Profile | null) ?? null;
    setProfile(p);
    setUser(p ? { id: p.id, email: p.email ?? null } : null);
    setReady(true);
    // Blocked accounts can't use the shop (the database refuses their actions too)
    if (p?.role === "blocked" && !window.location.pathname.startsWith("/blocked")) window.location.replace("/blocked");
  }, [sb, isSignedIn]);

  // Load once Clerk has loaded, and again whenever the signed-in person changes
  useEffect(() => {
    if (!isLoaded) return;
    if (last.current === userId) return;
    const first = last.current === undefined;
    last.current = userId ?? null;
    if (first && initialUser && isSignedIn) return; // the server already sent the profile
    void refresh();
  }, [isLoaded, userId, isSignedIn, initialUser, refresh]);

  const signOut = useCallback(async () => {
    await clerk.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/";
  }, [clerk]);

  return <SessionCtx.Provider value={{ user, profile, ready, refresh, signOut }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
