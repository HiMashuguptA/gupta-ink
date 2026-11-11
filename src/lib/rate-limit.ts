import "server-only";

/**
 * Small per-visitor limiter for paid or abusable endpoints (Google Maps look-ups, uploads,
 * payment requests). Counts live in the Worker's memory, so each Cloudflare location keeps
 * its own count: enough to stop a stuck script or a bot from running up the Maps bill.
 * Database actions (orders, coupons, searches) have their own limits in Postgres.
 */
const hits = new Map<string, { n: number; reset: number }>();

export function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** true = allowed. `limit` requests per `windowSec` for this key. */
export function allow(key: string, limit: number, windowSec: number) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowSec * 1000 });
    return true;
  }
  h.n++;
  return h.n <= limit;
}

export const tooMany = () =>
  new Response(JSON.stringify({ error: "Too many requests. Please wait a minute and try again." }), {
    status: 429, headers: { "content-type": "application/json", "retry-after": "60" },
  });
