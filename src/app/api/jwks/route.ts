import { NextResponse } from "next/server";
import { anonPublicJwk } from "@/lib/anon-token";

export const dynamic = "force-dynamic";

/** Clerk's frontend API host, read from the publishable key (pk_live_<base64 "host$">). */
function clerkHost() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  try {
    return atob(pk.replace(/^pk_(live|test)_/, "")).replace(/\$$/, "");
  } catch {
    return "";
  }
}

/**
 * The one key list the Neon Data API trusts: Clerk's signing keys (signed-in shoppers)
 * plus the shop's own guest key (see src/lib/anon-token.ts).
 */
export async function GET(req: Request) {
  console.log("jwks requested by", req.headers.get("user-agent") ?? "unknown", req.headers.get("cf-connecting-ip") ?? "");
  const keys: unknown[] = [];
  const host = clerkHost();
  if (host) {
    try {
      const r = await fetch(`https://${host}/.well-known/jwks.json`, { cf: { cacheTtl: 600 } } as RequestInit);
      if (r.ok) keys.push(...(((await r.json()) as { keys?: unknown[] }).keys ?? []));
    } catch {}
  }
  try {
    keys.push(await anonPublicJwk());
  } catch {}
  if (!keys.length) return NextResponse.json({ error: "No keys available" }, { status: 503 });
  return NextResponse.json({ keys }, { headers: { "cache-control": "public, max-age=300" } });
}
