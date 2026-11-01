import { NextResponse, type NextRequest } from "next/server";
import { housekeeping, sendOutbox } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/** Called every minute by the Cloudflare cron trigger (worker.ts), with the shared CRON_SECRET. */
export async function POST(req: NextRequest) {
  const want = process.env.CRON_SECRET;
  if (!want || req.headers.get("x-cron-secret") !== want) return new NextResponse("Forbidden", { status: 403 });
  const [sent, ran] = await Promise.all([sendOutbox().catch((e) => ({ error: String(e) })), housekeeping().catch((e) => [String(e)])]);
  return NextResponse.json({ sent, ran });
}
