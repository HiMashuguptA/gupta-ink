"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export type SessionUser = { id: string; email: string | null };

type Ctx = { user: SessionUser | null; profile: Profile | null; refresh: () => Promise<void>; signOut: () => Promise<void> };
const SessionCtx = createContext<Ctx>({ user: null, profile: null, refresh: async () => {}, signOut: async () => {} });

export function SessionProvider({ initialUser, initialProfile, children }: { initialUser: SessionUser | null; initialProfile: Profile | null; children: React.ReactNode }) {
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  const sb = supabaseBrowser();

  // Reads the session saved in this browser (no network call); the server and the
  // database still verify the sign-in on every request that matters.
  const refresh = useCallback(async () => {
    const { data: { session } } = await sb.auth.getSession();
    const u = session?.user;
    const user = u ? { id: u.id, email: u.email ?? null } : null;
    setUser(user);
    if (!user) return setProfile(null);
    const { data } = await sb
      .from("profiles")
      .select("id, email, name, phone, avatar_url, role, referral_code, referral_prompt_done, welcome_seen, created_at")
      .eq("id", user.id)
      .single();
    setProfile(data as Profile | null);
  }, [sb]);

  useEffect(() => {
    // The library re-announces SIGNED_IN whenever the tab regains focus; only act on real changes.
    let current = initialUser?.id ?? null;
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id ?? null;
      if (event === "USER_UPDATED" || id !== current) { current = id; void refresh(); }
    });
    return () => sub.subscription.unsubscribe();
  }, [sb, refresh, initialUser?.id]);

  const signOut = useCallback(async () => {
    await sb.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/";
  }, [sb]);

  return <SessionCtx.Provider value={{ user, profile, refresh, signOut }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
