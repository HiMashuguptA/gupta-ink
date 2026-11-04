import { NextResponse } from "next/server";
import { signGuest } from "@/lib/anon-token";
import { DATA_API_URL } from "@/lib/db/rest";

export const dynamic = "force-dynamic";

// TEMPORARY probe: which guest-token shapes does the Neon Data API accept? Reads one category name only.
export async function GET() {
  const now = Math.floor(Date.now() / 1000);
  const base = { sub: "anonymous", iat: now - 30, exp: now + 300 };
  const variants: Record<string, Record<string, unknown>> = {
    no_role: { ...base, iss: "gupta-enterprises" },
    role_anonymous: { ...base, iss: "gupta-enterprises", role: "anonymous" },
    no_iss: { ...base },
    iss_clerk: { ...base, iss: "https://clerk.guptaenterpriseskohima.com" },
  };
  const out: Record<string, unknown> = { url: DATA_API_URL };
  for (const [k, claims] of Object.entries(variants)) {
    try {
      const r = await fetch(`${DATA_API_URL}/categories?select=name&limit=1`, { headers: { authorization: `Bearer ${await signGuest(claims)}` } });
      out[k] = { status: r.status, body: (await r.text()).slice(0, 200) };
    } catch (e) {
      out[k] = { error: String(e) };
    }
  }
  const r0 = await fetch(`${DATA_API_URL}/categories?select=name&limit=1`).catch(() => null);
  out.no_token = r0 ? { status: r0.status, body: (await r0.text()).slice(0, 200) } : "fetch failed";
  return NextResponse.json(out);
}
