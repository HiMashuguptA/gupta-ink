import { PostgrestClient } from "@supabase/postgrest-js";
import type { Database } from "../database.types";

/**
 * Supabase REST API (PostgREST). Every request carries the publishable key, plus the shopper's
 * Clerk session token when signed in (Supabase trusts Clerk through third-party auth) so row
 * security applies. Without a token, requests run as the anon role (public catalogue only).
 */
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const DATA_API_URL = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : "";

export type Rest = PostgrestClient<Database>;
export type TokenGetter = () => Promise<string | null | undefined>;

export function makeRest(getToken?: TokenGetter, init?: { next?: { revalidate?: number | false; tags?: string[] } }): Rest {
  return new PostgrestClient<Database>(DATA_API_URL, {
    fetch: async (input: RequestInfo | URL, req?: RequestInit) => {
      const headers = new Headers(req?.headers);
      if (PUBLISHABLE_KEY) headers.set("apikey", PUBLISHABLE_KEY);
      const token = getToken ? await getToken() : null;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...req, headers, ...(init?.next ? { next: init.next } : {}) } as RequestInit);
    },
  });
}
