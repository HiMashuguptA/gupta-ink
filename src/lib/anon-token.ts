import "server-only";
import { sql } from "@/lib/jobs";

/**
 * Guest access to the Neon Data API. The Data API only accepts requests that carry a JWT, so
 * visitors who are not signed in get a short-lived token signed by the shop itself. It has no
 * `role` claim, so the database runs it as the `anonymous` role (public catalogue only).
 *
 * The signing key (ES256) is created by the shop on first use and kept in private.secrets;
 * it never leaves the server. /api/jwks publishes its public half together with Clerk's keys,
 * and that one URL is what the Data API trusts.
 */
type KeyPair = { privateKey: CryptoKey; publicJwk: JsonWebKey & { kid: string; alg: string; use: string } };
const NAME = "anon_jwt_key";
const KID = "ge-anon-1";
const TTL = 60 * 60; // one hour

let pair: Promise<KeyPair> | null = null;

async function loadPair(): Promise<KeyPair> {
  const db = sql();
  let rows = (await db`select decrypted_secret from private.secrets where name = ${NAME}`) as { decrypted_secret: string }[];
  if (!rows[0]) {
    const k = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const jwk = JSON.stringify(await crypto.subtle.exportKey("jwk", k.privateKey));
    await db`insert into private.secrets (name, decrypted_secret) values (${NAME}, ${jwk}) on conflict (name) do nothing`;
    rows = (await db`select decrypted_secret from private.secrets where name = ${NAME}`) as { decrypted_secret: string }[];
  }
  const priv = JSON.parse(rows[0].decrypted_secret) as JsonWebKey;
  const privateKey = await crypto.subtle.importKey("jwk", priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const { kty, crv, x, y } = priv;
  return { privateKey, publicJwk: { kty, crv, x, y, kid: KID, alg: "ES256", use: "sig" } };
}

function keys() {
  if (!pair) pair = loadPair().catch((e) => { pair = null; throw e; });
  return pair;
}

export async function anonPublicJwk() {
  return (await keys()).publicJwk;
}

const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = new TextEncoder();

let cached: { token: string; exp: number } | null = null;

/** A guest token, reused until five minutes before it expires. */
export async function anonToken(): Promise<{ token: string; exp: number }> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 300 > now) return cached;
  const { privateKey } = await keys();
  const header = b64url(enc.encode(JSON.stringify({ alg: "ES256", typ: "JWT", kid: KID })));
  const exp = now + TTL;
  const payload = b64url(enc.encode(JSON.stringify({ sub: "anonymous", iss: "gupta-enterprises", iat: now - 30, exp })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, enc.encode(`${header}.${payload}`));
  cached = { token: `${header}.${payload}.${b64url(sig)}`, exp };
  return cached;
}
