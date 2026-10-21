"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Shrinks a photo to at most 1600px and WebP so uploads stay small on mobile data. */
const EXT_TYPE: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Some phones and file pickers leave the type blank or say "image/jpg"; work it out from the name. */
function typeOf(file: File) {
  const t = (file.type || "").toLowerCase();
  if (t === "image/jpg" || t === "image/pjpeg") return "image/jpeg";
  if (t) return t;
  return EXT_TYPE[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

async function compress(file: File, max = 1600): Promise<Blob> {
  const type = typeOf(file);
  if (type === "image/heic" || type === "image/heif" || /\.hei[cf]$/i.test(file.name)) {
    throw new Error("iPhone HEIC photos aren't supported. In Settings > Camera > Formats choose 'Most Compatible', or share the photo as JPEG.");
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) throw new Error(`${file.name}: choose a JPG, PNG or WebP photo`);
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    // WebP where the browser can make it (Safari makes PNG instead, so fall back to JPEG there)
    let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp") blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (blob && blob.size < file.size) return blob;
  } catch { /* fall back to the original */ }
  if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is over 5 MB. Choose a smaller photo.`);
  return new Blob([file], { type });
}

/** Uploads into the caller's own folder of a bucket and returns the stored path. */
export async function uploadPhoto(bucket: "returns" | "reviews" | "refund-proofs" | "products" | "banners", folder: string, file: File): Promise<string> {
  const blob = await compress(file);
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseBrowser().storage.from(bucket).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

