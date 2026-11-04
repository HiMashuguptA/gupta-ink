import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";
import cacheApiIncrementalCache from "./cloudflare/cache-api-incremental-cache";

// Free setup: no R2 or KV. Pages and catalogue data are cached with the Workers Cache API,
// and pages past their revalidate time are refreshed in the background by the memory queue.
export default defineCloudflareConfig({
	incrementalCache: cacheApiIncrementalCache as never,
	queue: memoryQueue,
});
