/**
 * Fonts and pictures for share images. Satori needs woff/ttf, not woff2. Files live in public/;
 * they are read from disk when building (Node) and fetched from the site when running on Cloudflare.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://guptaenterpriseskohima.com").replace(/\/$/, "");

async function publicFile(src: string): Promise<ArrayBuffer | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const buf = await readFile(path.join(process.cwd(), "public", src));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    try {
      const r = await fetch(`${SITE}${src}`);
      return r.ok ? await r.arrayBuffer() : null;
    } catch { return null; }
  }
}

const b64 = (buf: ArrayBuffer) => {
  let s = ""; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

export async function ogFonts() {
  // Latin subsets with the rupee sign (₹) merged in
  const [sign, body, bold] = await Promise.all([publicFile("/og/sign-800.woff"), publicFile("/og/body-500.woff"), publicFile("/og/body-700.woff")]);
  return [
    ...(sign ? [{ name: "Sign", data: sign, weight: 800 as const, style: "normal" as const }] : []),
    ...(body ? [{ name: "Body", data: body, weight: 500 as const, style: "normal" as const }] : []),
    ...(bold ? [{ name: "Body", data: bold, weight: 700 as const, style: "normal" as const }] : []),
  ];
}

/** A picture Satori can draw: site files as data URIs, outside photos (file storage, shop CDN) as absolute links. */
export async function publicAsDataUri(src: string | null | undefined) {
  if (!src) return null;
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/media/")) return `${SITE}${src}`;
  const buf = await publicFile(src);
  if (!buf) return null;
  const type = src.endsWith(".svg") ? "image/svg+xml" : src.endsWith(".png") ? "image/png" : src.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return `data:${type};base64,${b64(buf)}`;
}

/** The GE logo on its white plate. */
export async function markUri() {
  return (await publicAsDataUri("/brand/logo.svg")) ?? `${SITE}/brand/logo.svg`;
}
