import { NextResponse } from "next/server";
import { anonToken } from "@/lib/anon-token";

export const dynamic = "force-dynamic";

/** A short-lived guest token for browsing while signed out (anonymous role, public data only). */
export async function GET() {
  try {
    return NextResponse.json(await anonToken(), { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
