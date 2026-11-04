import "server-only";

/**
 * Server-only access to Supabase with the secret key (service_role: skips row security).
 * Used by background jobs, payment webhooks and key look-ups. Never sent to browsers.
 */
type Json = Record<string, unknown>;
const base = () => (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
function headers(extra?: Record<string, string>) {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  const h: Record<string, string> = { apikey: key, "content-type": "application/json", ...extra };
  if (key.startsWith("eyJ")) h.authorization = `Bearer ${key}`;
  return h;
}

/** Call a database function: rpc("_outbox_take", { p_channel: "email", p_limit: 20 }) */
export async function rpc<T = unknown>(fn: string, args: Json = {}): Promise<T> {
  const r = await fetch(`${base()}/rest/v1/rpc/${fn}`, { method: "POST", headers: headers(), body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`${fn} failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

/** Read rows: select("settings", "store_name,support_email", "id=eq.1") */
export async function select<T = Json>(table: string, columns: string, filter = ""): Promise<T[]> {
  const r = await fetch(`${base()}/rest/v1/${table}?select=${encodeURIComponent(columns)}${filter ? `&${filter}` : ""}`, { headers: headers() });
  if (!r.ok) throw new Error(`${table} read failed (${r.status})`);
  return (await r.json()) as T[];
}

/** Insert or update rows by primary key. */
export async function upsert(table: string, rows: Json[]) {
  if (!rows.length) return;
  const r = await fetch(`${base()}/rest/v1/${table}`, {
    method: "POST", headers: headers({ prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`${table} write failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
}

/** A key from private.secrets (Resend, WhatsApp gateway, distance signing). */
export async function secret(name: string, env?: string): Promise<string | null> {
  if (env && process.env[env]) return process.env[env]!;
  return (await rpc<string | null>("_secret_get", { p_name: name })) ?? null;
}
