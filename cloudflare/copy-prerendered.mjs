// Runs just before every deploy (wrangler.jsonc "build.command").
// Copies the pages that were built with this deploy into the Worker's static files, under
// cdn-cgi/_next_cache (a path only the Worker itself can read). The page cache falls back to
// these copies whenever a page is not in a data centre's cache, so it never has to be rendered
// while a visitor or a search engine waits. See cloudflare/cache-api-incremental-cache.ts.
import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const out = path.resolve(".open-next");
const from = path.join(out, "cache");
const to = path.join(out, "assets", "cdn-cgi", "_next_cache");

if (!existsSync(from)) {
  console.log("copy-prerendered: no .open-next/cache (run `npx opennextjs-cloudflare build` first); nothing copied");
  process.exit(0);
}
rmSync(to, { recursive: true, force: true });
let files = 0, bytes = 0;
// Pages only (*.cache). Catalogue data entries (__fetch) are not served from here.
cpSync(from, to, {
  recursive: true,
  filter: (src) => {
    if (path.basename(src) === "__fetch") return false;
    const st = statSync(src);
    if (st.isDirectory()) return true;
    if (!src.endsWith(".cache")) return false;
    files++; bytes += st.size;
    return true;
  },
});
console.log(`copy-prerendered: ${files} built pages (${(bytes / 1e6).toFixed(1)} MB) -> ${path.relative(process.cwd(), to)} [builds: ${readdirSync(to).join(", ")}]`);
// Workers allows 20,000 static files per deploy on the free plan
if (files > 15000) console.warn("copy-prerendered: close to the static file limit; consider building fewer pages ahead of time");
