import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/supabase/server";
import { mediaBucket, PRIVATE_BUCKETS, PUBLIC_BUCKETS } from "@/lib/media";

const ADMIN_ONLY = new Set(["products", "banners", "categories", "refund-proofs"]);
const OWN_FOLDER = new Set(["reviews", "returns"]);
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 5 * 1024 * 1024;

/**
 * Upload one photo to file storage (Supabase Storage). The same rules the database used for files:
 * catalogue pictures and refund proofs are admin-only; review and return photos go only into
 * the uploader's own folder. Photos only, 5 MB at most.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path } = await ctx.params;
  const key = path.join("/");
  if (![...PUBLIC_BUCKETS, ...PRIVATE_BUCKETS].includes(bucket as never) || !/^[\w-]+(\/[\w.-]+)+$/.test(key) || key.includes("..")) {
    return new NextResponse("Not allowed", { status: 400 });
  }
  const { profile } = await getSessionProfile();
  if (!profile || profile.role === "blocked") return new NextResponse("Please sign in", { status: 401 });
  if (ADMIN_ONLY.has(bucket) && profile.role !== "admin") return new NextResponse("Admins only", { status: 403 });
  if (OWN_FOLDER.has(bucket) && path[0] !== profile.id) return new NextResponse("Not your folder", { status: 403 });

  const type = (req.headers.get("content-type") ?? "").split(";")[0];
  if (!TYPES.has(type)) return new NextResponse("Photos only (JPG, PNG or WebP)", { status: 415 });
  const body = await req.arrayBuffer();
  if (body.byteLength > MAX) return new NextResponse("Photo is over 5 MB", { status: 413 });

  const r2 = await mediaBucket();
  if (!r2) return new NextResponse("File storage is not connected", { status: 503 });
  await r2.put(`${bucket}/${key}`, body, { httpMetadata: { contentType: type } });
  return NextResponse.json({ path: key });
}
