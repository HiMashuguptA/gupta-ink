import { PostgrestClient } from "@supabase/postgrest-js";
import type { Database } from "../database.types";

/**
 * Neon Data API (PostgREST-compatible). Every request carries the shopper's Clerk session token
 * when there is one; the database checks it and applies row security, exactly as before.
 * Without a token, requests run as the anonymous role (public catalogue only).
 */
export const DATA_API_URL = (process.env.NEXT_PUBLIC_DATA_API_URL ?? "").replace(/\/$/, "");

export type Rest = PostgrestClient<Database>;
export type TokenGetter = () => Promise<string | null | undefined>;

export function makeRest(getToken?: TokenGetter, init?: { next?: { revalidate?: number | false; tags?: string[] } }): Rest {
  return new PostgrestClient<Database>(DATA_API_URL, {
    fetch: async (input: RequestInfo | URL, req?: RequestInit) => {
      const headers = new Headers(req?.headers);
      const token = getToken ? await getToken() : null;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...req, headers, ...(init?.next ? { next: init.next } : {}) } as RequestInit);
    },
  });
}
