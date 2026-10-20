"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type Ctx = { user: User | null; profile: Profile | null; refresh: () => Promise<void>; signOut: () => Promise<void> };
const SessionCtx = createContext<Ctx>({ user: null, profile: null, refresh: async () => {}, signOut: async () => {} });

export function SessionProvider({ initialUser, initialProfile, children }: { initialUser: User | null; initialProfile: Profile | null; children: React.ReactNode }) {
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  const sb = supabaseBrowser();

  const refresh = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser();
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
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [sb, refresh]);

  const signOut = useCallback(async () => {
    await sb.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/";
  }, [sb]);

  return <SessionCtx.Provider value={{ user, profile, refresh, signOut }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
