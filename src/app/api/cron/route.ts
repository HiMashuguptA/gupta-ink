import { NextResponse, type NextRequest } from "next/server";
import { housekeeping, processRefunds, sendOutbox } from "@/lib/jobs";
import { internalSecret } from "@/lib/secrets";
import { pingStorage } from "@/lib/media";

export const dynamic = "force-dynamic";

/** Called every minute by the Cloudflare cron trigger (worker.ts), with the shared CRON_SECRET. */
export async function POST(req: NextRequest) {
  const want = internalSecret("CRON_SECRET");
  if (!want || req.headers.get("x-cron-secret") !== want) return new NextResponse("Forbidden", { status: 403 });
  const [sent, ran, refunds] = await Promise.all([
    sendOutbox().catch((e) => ({ error: String(e) })),
    housekeeping().catch((e) => [String(e)]),
    processRefunds().catch((e) => ({ error: String(e) })),
  ]);
  // Once an hour, touch file storage so the free Supabase project stays awake.
  if (new Date().getUTCMinutes() === 0) await pingStorage().catch(() => null);
  return NextResponse.json({ sent, ran, refunds });
}
