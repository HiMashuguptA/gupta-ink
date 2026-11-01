import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Fonts for share images (Satori needs woff/ttf, not woff2). Bundled next to this file. */
export async function ogFonts() {
  const dir = path.join(process.cwd(), "src/lib/og");
  // Latin subsets with the rupee sign (₹) merged in
  const [sign, body, bold] = await Promise.all([
    readFile(path.join(dir, "sign-800.woff")), readFile(path.join(dir, "body-500.woff")), readFile(path.join(dir, "body-700.woff")),
  ]);
  return [
    { name: "Sign", data: sign, weight: 800 as const, style: "normal" as const },
    { name: "Body", data: body, weight: 500 as const, style: "normal" as const },
    { name: "Body", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

/** A public file (e.g. /catalog/pen-1.svg) as a data URI Satori can draw. */
export async function publicAsDataUri(src: string | null | undefined) {
  if (!src || !src.startsWith("/")) return src ?? null;
  try {
    const buf = await readFile(path.join(process.cwd(), "public", src));
    const type = src.endsWith(".svg") ? "image/svg+xml" : src.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch { return null; }
}

/** The GE logo on its white plate, for share images. */
export const markUri = `data:image/svg+xml;base64,${readFileSync(path.join(process.cwd(), "public/brand/logo.svg")).toString("base64")}`;
