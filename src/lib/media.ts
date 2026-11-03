import "server-only";
import { internalSecret } from "@/lib/secrets";

/**
 * Files live in Cloudflare R2 (binding MEDIA). Public buckets are served at /media/<bucket>/<path>;
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

/** The R2 bucket binding from the Cloudflare runtime (undefined when running outside Cloudflare). */
export async function mediaBucket(): Promise<R2BucketLike | undefined> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return (getCloudflareContext().env as unknown as { MEDIA?: R2BucketLike }).MEDIA;
  } catch {
    return undefined;
  }
}

export type R2ObjectLike = { body: ReadableStream; httpMetadata?: { contentType?: string }; size: number; httpEtag?: string };
export type R2BucketLike = {
  get: (key: string) => Promise<R2ObjectLike | null>;
  put: (key: string, value: ArrayBuffer | ReadableStream | Blob, opts?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
};
