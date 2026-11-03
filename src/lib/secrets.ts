import "server-only";
import { createHmac } from "node:crypto";

/**
 * Internal keys (cron, signed file links) come from their own env var when set, otherwise they are
 * derived from CLERK_SECRET_KEY, so the dashboard only needs a few secrets. Rotating the Clerk key rotates these too.
 */
export function internalSecret(name: "CRON_SECRET" | "MEDIA_SIGNING_KEY") {
  const own = process.env[name];
  if (own) return own;
  const base = process.env.CLERK_SECRET_KEY;
  if (!base) return "";
  return createHmac("sha256", base).update(`gupta-enterprises:${name}`).digest("hex");
}
