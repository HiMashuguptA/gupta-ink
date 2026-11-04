import { NextResponse, type NextRequest } from "next/server";
import { mediaBucket, PRIVATE_BUCKETS, PUBLIC_BUCKETS, verifyMedia } from "@/lib/media";

/** Serves photos from file storage. Public buckets are cached for a week; private ones need a signed, expiring link. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path } = await ctx.params;
  const key = path.join("/");
  const isPublic = PUBLIC_BUCKETS.includes(bucket as never);
  if (!isPublic && !PRIVATE_BUCKETS.includes(bucket as never)) return new NextResponse("Not found", { status: 404 });
  if (!isPublic) {
    const ok = await verifyMedia(bucket, key, req.nextUrl.searchParams.get("exp"), req.nextUrl.searchParams.get("sig"));
    if (!ok) return new NextResponse("This link has expired", { status: 403 });
  }
  const r2 = await mediaBucket();
  const obj = r2 ? await r2.get(`${bucket}/${key}`) : null;
  if (!obj) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": isPublic ? "public, max-age=604800, immutable" : "private, max-age=300",
      ...(obj.httpEtag ? { etag: obj.httpEtag } : {}),
    },
  });
}
