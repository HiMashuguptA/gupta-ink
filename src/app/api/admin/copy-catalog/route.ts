import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { rpc, secret, upsert } from "@/lib/admin-db";

export const dynamic = "force-dynamic";

// ONE-TIME: copies the catalogue and settings from Neon into Supabase. Needs ?t=<copy_token>.
// Delete this route (and the @neondatabase/serverless package) once the copy is done.
const TABLES = ["categories", "product_groups", "products", "home_sections", "coupons", "settings", "messaging_settings"];

export async function GET(req: Request) {
  const want = await secret("copy_token").catch(() => null);
  const t = new URL(req.url).searchParams.get("t");
  if (!want || t !== want) return new NextResponse("Not allowed", { status: 403 });
  if (!process.env.DATABASE_URL) return new NextResponse("DATABASE_URL (Neon) is not set", { status: 500 });
  const db = neon(process.env.DATABASE_URL);
  const done: Record<string, number> = {};
  for (const table of TABLES) {
    const rows = (await db.query(`select * from public.${table}`)) as Record<string, unknown>[];
    for (let i = 0; i < rows.length; i += 200) await upsert(table, rows.slice(i, i + 200));
    done[table] = rows.length;
  }
  const keys = (await db.query(`select name, decrypted_secret from private.secrets where name in ('resend_api_key', 'distance_hmac', 'openwa_api_key')`)) as { name: string; decrypted_secret: string }[];
  for (const k of keys) await rpc("_secret_set", { p_name: k.name, p_value: k.decrypted_secret });
  done.secrets = keys.length;
  await rpc("_secret_set", { p_name: "copy_token", p_value: null });
  return NextResponse.json({ ok: true, copied: done });
}
