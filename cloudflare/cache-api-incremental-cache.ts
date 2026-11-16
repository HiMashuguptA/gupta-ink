// Free page/data cache for OpenNext on Cloudflare (no R2 or KV needed), in two layers:
//
// 1. The Workers Cache API holds pages and data refreshed on the live site. Entries live in each
//    Cloudflare data centre for up to a day. (It only works on a custom domain, not on *.workers.dev.)
// 2. When a page is not in that cache (first visit in a data centre, after a deploy, after a day),
//    the copy that was built with the deploy is served from the Worker's static files. It counts
//    as stale, so the visitor gets the page at once and the memory queue re-renders it in the
//    background. Without this layer every such visit had to render the page on the spot, which
//    regularly ran past the free plan's CPU limit (Error 1102, a 503 for people and search engines).
//
// cloudflare/copy-prerendered.mjs puts the built pages where layer 2 reads them.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import builtPages from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

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
    if (c) {
      try {
        const r = await c.match(cacheKey(key, cacheType));
        if (r) return (await r.json()) as Entry;
      } catch {
        // fall through to the built copy
      }
    }
    // Pages only: catalogue data keeps its own rules (fetched fresh when not cached)
    if (cacheType && cacheType !== "cache") return null;
    try {
      return ((await builtPages.get(key, "cache")) as Entry | null) ?? null;
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
