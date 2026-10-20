import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Sessionless client for public catalogue reads (products, categories, banners,
 * settings). It never touches cookies, so its results can be cached and shared
 * across all visitors. Row Level Security still applies (anonymous role).
 */
let client: ReturnType<typeof createClient<Database>> | null = null;
export function supabasePublic() {
  if (!client) {
    client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
