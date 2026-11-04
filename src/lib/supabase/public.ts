import "server-only";
import { makeRest, type Rest } from "@/lib/db/rest";
import { anonToken } from "@/lib/anon-token";

/**
 * Sessionless client for public catalogue reads (products, categories, banners, settings).
 * Uses the shop's guest token, so results can be cached and shared across all visitors;
 * row security still applies (anonymous role).
 */
let client: Rest | null = null;
export function supabasePublic(): Rest {
  if (!client) client = makeRest(async () => (await anonToken()).token);
  return client;
}
