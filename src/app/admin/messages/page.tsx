import { getSessionProfile } from "@/lib/supabase/server";
import { Composer, type CouponLite } from "./Composer";
import { ChannelSetup, type MsgStatus } from "./ChannelSetup";
import { CampaignLog, type CampaignRow } from "./CampaignLog";

export const metadata = { title: "Messages" };

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ coupon?: string }> }) {
  const { coupon } = await searchParams;
  const { supabase } = await getSessionProfile();
  const [status, coupons, campaigns] = await Promise.all([
    supabase.rpc("admin_messaging_status"),
    supabase.from("coupons").select("code, title, description, type, value, max_discount_paise, min_order_paise, valid_to, active").eq("active", true).order("created_at", { ascending: false }).limit(30),
    supabase.from("campaigns").select("id, title, body, channels, audience, inactive_days, coupon_code, recipients, created_at").order("created_at", { ascending: false }).limit(15),
  ]);
  const ids = (campaigns.data ?? []).map((c) => c.id);
  const { data: out } = ids.length
    ? await supabase.from("outbox").select("campaign_id, channel, status").in("campaign_id", ids).limit(5000)
    : { data: [] as { campaign_id: string | null; channel: string; status: string }[] };
  const rows: CampaignRow[] = (campaigns.data ?? []).map((c) => {
    const mine = (out ?? []).filter((o) => o.campaign_id === c.id);
    const tally = (ch: string) => ({
      sent: mine.filter((o) => o.channel === ch && o.status === "sent").length,
      waiting: mine.filter((o) => o.channel === ch && (o.status === "queued" || o.status === "sending")).length,
      failed: mine.filter((o) => o.channel === ch && o.status === "failed").length,
    });
    return { ...c, email: tally("email"), whatsapp: tally("whatsapp") } as CampaignRow;
  });

  return (
    <div className="max-w-5xl">
      <h1 className="text-[34px] uppercase">Messages</h1>
      <p className="mt-1 text-sm text-muted">Send offers and news to customers in the app, by email and on WhatsApp. Messages go out a few at a time so nothing hits a daily limit.</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Composer coupons={(coupons.data ?? []) as CouponLite[]} initialCoupon={coupon ?? null} status={(status.data ?? null) as MsgStatus | null} />
        <ChannelSetup initial={(status.data ?? null) as MsgStatus | null} error={status.error?.message ?? null} />
      </div>
      <CampaignLog rows={rows} />
    </div>
  );
}
