"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Shrinks a photo to at most 1600px and WebP so uploads stay small on mobile data. */
async function compress(file: File, max = 1600): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo (JPG, PNG or WebP)");
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
    if (blob && blob.size < file.size) return blob;
  } catch { /* fall back to the original */ }
  if (file.size > 5 * 1024 * 1024) throw new Error("That photo is over 5 MB");
  return file;
}

/** Uploads into the caller's own folder of a bucket and returns the stored path. */
export async function uploadPhoto(bucket: "returns" | "reviews" | "refund-proofs" | "products" | "banners", folder: string, file: File): Promise<string> {
  const blob = await compress(file);
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseBrowser().storage.from(bucket).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

