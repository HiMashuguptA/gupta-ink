import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../database.types";
import type { Profile } from "../types";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Called from a Server Component: the middleware refreshes cookies instead.
          }
        },
      },
    },
  );
}

export type SessionUser = { id: string; email: string | null };

/** Reads the claims of a sign-in token without checking it (the database checks it, see below). */
function peekClaims(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const part = token.split(".")[1];
    return JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * The signed-in user and their profile, resolved once per request (React cache),
 * so layout and page share one lookup.
 *
 * Speed: this makes one database call and no call to the sign-in server. The token is
 * read from the cookie, then the profile is fetched *with that token*; the database
 * checks the token's signature and row security only returns the row whose id matches
 * the token. So a forged or expired token gets no profile and counts as signed out.
 */
export const getSessionProfile = cache(async () => {
  const supabase = await supabaseServer();
  const signedOut = { supabase, user: null as SessionUser | null, profile: null as Profile | null };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const claims = token ? peekClaims(token) : null;
  if (!claims?.sub || (claims.exp && claims.exp * 1000 < Date.now())) return signedOut;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, name, phone, avatar_url, role, referral_code, referral_prompt_done, welcome_seen, created_at")
    .eq("id", claims.sub)
    .maybeSingle();
  if (error || !profile || profile.id !== claims.sub) return signedOut;
  const user: SessionUser = { id: claims.sub, email: claims.email ?? profile.email ?? null };
  return { supabase, user, profile: profile as Profile };
});
