import "server-only";
import { internalSecret } from "@/lib/secrets";

/**
 * Files live in Supabase Storage. Public buckets are served at /media/<bucket>/<path>;
 * private ones (return photos, refund proofs) need a link signed here that expires.
 */
export const PUBLIC_BUCKETS = ["products", "banners", "reviews", "categories"] as const;
export const PRIVATE_BUCKETS = ["returns", "refund-proofs"] as const;

const enc = new TextEncoder();
async function key() {
  const secret = internalSecret("MEDIA_SIGNING_KEY");
  if (!secret) throw new Error("CLERK_SECRET_KEY is not set");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function signMedia(bucket: string, path: string, seconds = 3600) {
  const exp = Math.floor(Date.now() / 1000) + seconds;
  const sig = hex(await crypto.subtle.sign("HMAC", await key(), enc.encode(`${bucket}/${path}:${exp}`)));
  return `/media/${bucket}/${path}?exp=${exp}&sig=${sig}`;
}

export async function verifyMedia(bucket: string, path: string, exp: string | null, sig: string | null) {
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const want = hex(await crypto.subtle.sign("HMAC", await key(), enc.encode(`${bucket}/${path}:${exp}`)));
  return want.length === sig.length && want === sig;
}

/**
 * File storage: Supabase Storage (free 1 GB). Keys look like "<bucket>/<path>", same as before.
 * Needs SUPABASE_URL (public) and SUPABASE_SECRET_KEY (secret, server only).
 */
export async function mediaBucket(): Promise<R2BucketLike | undefined> {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!base || !secret) return undefined;
  const auth: Record<string, string> = { apikey: secret };
  // Old-style service_role keys are JWTs and also go in Authorization; new sb_secret_ keys only in apikey.
  if (secret.startsWith("eyJ")) auth.authorization = `Bearer ${secret}`;
  const url = (key: string) => {
    const [bucket, ...rest] = key.split("/");
    return `${base}/storage/v1/object/${encodeURIComponent(bucket)}/${rest.map(encodeURIComponent).join("/")}`;
  };
  return {
    async get(key) {
      const r = await fetch(url(key), { headers: auth });
      if (!r.ok || !r.body) return null;
      return {
        body: r.body,
        size: Number(r.headers.get("content-length") ?? 0),
        httpMetadata: { contentType: r.headers.get("content-type") ?? undefined },
        httpEtag: r.headers.get("etag") ?? undefined,
      };
    },
    async put(key, value, opts) {
      const r = await fetch(url(key), {
        method: "POST",
        headers: { ...auth, "x-upsert": "true", "content-type": opts?.httpMetadata?.contentType ?? "application/octet-stream" },
        body: value as BodyInit,
      });
      if (!r.ok) throw new Error(`Upload failed (${r.status})`);
    },
    async delete(key) {
      await fetch(url(key), { method: "DELETE", headers: auth });
    },
  };
}

/** Light call so the free Supabase project counts as active and does not pause. */
export async function pingStorage() {
  const b = await mediaBucket();
  if (b) await b.get("products/.keepalive").catch(() => null);
}

export type R2ObjectLike = { body: ReadableStream; httpMetadata?: { contentType?: string }; size: number; httpEtag?: string };
export type R2BucketLike = {
  get: (key: string) => Promise<R2ObjectLike | null>;
  put: (key: string, value: ArrayBuffer | ReadableStream | Blob, opts?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
};
