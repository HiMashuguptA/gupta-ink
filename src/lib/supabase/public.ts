import "server-only";
import { makeRest, type Rest } from "@/lib/db/rest";

/**
 * Sessionless client for public catalogue reads (products, categories, banners, settings).
 * No session token, so results can be cached and shared across all visitors; row security
 * still applies (anon role).
 */
let client: Rest | null = null;
export function supabasePublic(): Rest {
  if (!client) client = makeRest();
  return client;
}
