// Free page/data cache for OpenNext on Cloudflare, using the Workers Cache API (no R2 or KV needed).
// Entries live in each Cloudflare data centre for up to a day; stale ones are refreshed by the memory queue.
// Note: the Cache API only works on a custom domain, not on *.workers.dev (there it is simply a miss).
import { getCloudflareContext } from "@opennextjs/cloudflare";

const ORIGIN = "https://next-cache.internal/";
const TTL = 60 * 60 * 24;

type Entry = { value: unknown; lastModified: number };
const cacheKey = (key: string, type?: string) =>
  `${ORIGIN}${encodeURIComponent(process.env.OPEN_NEXT_BUILD_ID ?? "b")}/${type ?? "cache"}/${encodeURIComponent(key)}`;
const store = () => (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;

const cacheApiIncrementalCache = {
  name: "cache-api-incremental-cache",
  async get(key: string, cacheType?: string) {
    const c = store();
    if (!c) return null;
    try {
      const r = await c.match(cacheKey(key, cacheType));
      if (!r) return null;
      return (await r.json()) as Entry;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown, cacheType?: string) {
    const c = store();
    if (!c) return;
    const body = JSON.stringify({ value, lastModified: Date.now() } satisfies Entry);
    const put = c
      .put(cacheKey(key, cacheType), new Response(body, { headers: { "content-type": "application/json", "cache-control": `max-age=${TTL}` } }))
      .catch(() => undefined);
    try {
      getCloudflareContext().ctx.waitUntil(put);
    } catch {
      await put;
    }
  },
  async delete(key: string) {
    const c = store();
    if (c) await c.delete(cacheKey(key, "cache")).catch(() => false);
  },
};

export default cacheApiIncrementalCache;
