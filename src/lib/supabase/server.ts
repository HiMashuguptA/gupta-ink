import "server-only";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { makeRest, type Rest } from "@/lib/db/rest";
import { signMedia } from "@/lib/media";
import type { Profile } from "../types";

/**
 * Server-side database client for the signed-in person (Clerk session token on every request),
 * under its old name so pages keep working. Storage gives signed links for private files.
 */
export type ServerDb = Rest & {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (path: string, seconds: number) => Promise<{ data: { signedUrl: string } | null; error: null }>;
      createSignedUrls: (paths: string[], seconds: number) => Promise<{ data: { path: string; signedUrl: string }[]; error: null }>;
    };
  };
};

function withStorage(rest: Rest): ServerDb {
  return Object.assign(rest, {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, seconds: number) => ({ data: { signedUrl: await signMedia(bucket, path, seconds) }, error: null }),
        createSignedUrls: async (paths: string[], seconds: number) => ({
          data: await Promise.all(paths.map(async (p) => ({ path: p, signedUrl: await signMedia(bucket, p, seconds) }))), error: null,
        }),
      }),
    },
  }) as ServerDb;
}

export async function supabaseServer(): Promise<ServerDb> {
  const { getToken } = await auth();
  return withStorage(makeRest(() => getToken()));
}

export type SessionUser = { id: string; email: string | null };

/**
 * The signed-in person and their profile, once per request (React cache), so layout and page
 * share one lookup. ensure_profile() creates the profile and wallet on the first visit after
 * Google sign-in, and returns it afterwards; the database checks the Clerk token itself.
 */
export const getSessionProfile = cache(async () => {
  const supabase = await supabaseServer();
  const signedOut = { supabase, user: null as SessionUser | null, profile: null as Profile | null };
  const { userId } = await auth();
  if (!userId) return signedOut;
  const { data: profile, error } = await supabase.rpc("ensure_profile");
  if (error || !profile) return signedOut;
  const p = profile as unknown as Profile;
  return { supabase, user: { id: p.id, email: p.email ?? null } as SessionUser, profile: p };
});
