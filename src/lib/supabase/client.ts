"use client";
import { makeRest, type Rest } from "@/lib/db/rest";
import { PollChannel } from "@/lib/db/poll";

/**
 * The browser's database client. Kept under its old name so the whole app keeps working:
 * queries and functions go to the Neon Data API with the Clerk session token, files go to
 * Cloudflare R2 through /api/files, and live updates are polled (see PollChannel).
 */
type ClerkGlobal = { session?: { getToken: () => Promise<string | null> } | null };
const clerkToken = async () => {
  const c = (globalThis as unknown as { Clerk?: ClerkGlobal }).Clerk;
  try { return (await c?.session?.getToken()) ?? null; } catch { return null; }
};

export type UploadResult = { data: { path: string } | null; error: { message: string } | null };

function storageBucket(bucket: string) {
  return {
    async upload(path: string, body: Blob, opts?: { contentType?: string; upsert?: boolean }): Promise<UploadResult> {
      const r = await fetch(`/api/files/${bucket}/${path}`, {
        method: "PUT", body, headers: { "content-type": opts?.contentType || body.type || "application/octet-stream" },
      });
      if (!r.ok) return { data: null, error: { message: (await r.text().catch(() => "")) || `Upload failed (${r.status})` } };
      return { data: { path }, error: null };
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: `/media/${bucket}/${path}` } };
    },
  };
}

export type BrowserDb = Rest & {
  channel: (name: string) => PollChannel;
  removeChannel: (ch: PollChannel) => Promise<void>;
  storage: { from: (bucket: string) => ReturnType<typeof storageBucket> };
};

let client: BrowserDb | null = null;

export function supabaseBrowser(): BrowserDb {
  if (!client) {
    const rest = makeRest(clerkToken);
    client = Object.assign(rest, {
      channel: () => new PollChannel(rest),
      removeChannel: async (ch: PollChannel) => { ch.unsubscribe(); },
      storage: { from: storageBucket },
    }) as BrowserDb;
  }
  return client;
}
