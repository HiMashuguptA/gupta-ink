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

/**
 * The signed-in user and their profile, resolved once per request (React cache),
 * so layout and page share one lookup. getClaims() verifies the sign-in token
 * locally against the project's signing keys instead of calling the auth server.
 */
export const getSessionProfile = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { supabase, user: null as SessionUser | null, profile: null as Profile | null };
  const user: SessionUser = { id: claims.sub, email: (claims.email as string | undefined) ?? null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, phone, avatar_url, role, referral_code, referral_prompt_done, welcome_seen, created_at")
    .eq("id", user.id)
    .single();
  return { supabase, user, profile: profile as Profile | null };
});
