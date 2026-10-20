"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../database.types";

type Client = ReturnType<typeof createBrowserClient<Database>>;

let client: Client | null = null;

export function supabaseBrowser(): Client {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
