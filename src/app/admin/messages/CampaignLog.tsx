import { Bell, Mail, MessageCircle } from "lucide-react";

type Tally = { sent: number; waiting: number; failed: number };
export type CampaignRow = {
  id: string; title: string; body: string; channels: string[]; audience: string; inactive_days: number | null;
  coupon_code: string | null; recipients: number; created_at: string; email: Tally; whatsapp: Tally;
};

const AUD: Record<string, string> = { all: "All customers", inactive: "Haven't ordered", never_ordered: "Never ordered" };

function T({ t }: { t: Tally }) {
  return <span className="num">{t.sent} sent{t.waiting ? `, ${t.waiting} waiting` : ""}{t.failed ? <span className="text-margin">, {t.failed} failed</span> : ""}</span>;
}

export function CampaignLog({ rows }: { rows: CampaignRow[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-[24px] uppercase">Sent messages</h2>
      {!rows.length ? (
        <p className="mt-2 rounded-[12px] bg-card p-6 text-center text-sm text-muted">Nothing sent yet. Your first message will show up here with how many people got it.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line rounded-[12px] bg-card text-sm">
          {rows.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">{r.title}</p>
                <time className="text-xs text-muted">{new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</time>
              </div>
              <p className="mt-0.5 line-clamp-2 text-muted">{r.body}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="font-semibold">{AUD[r.audience] ?? r.audience}{r.audience === "inactive" && r.inactive_days ? ` (${r.inactive_days} days)` : ""}</span>
                {r.coupon_code && <span className="rounded border border-dashed border-ink px-1.5 font-mono font-bold text-ink">{r.coupon_code}</span>}
                {r.channels.includes("inapp") && <span className="inline-flex items-center gap-1"><Bell className="size-3.5 text-ink" /> <span className="num">{r.recipients}</span> in app</span>}
                {r.channels.includes("email") && <span className="inline-flex items-center gap-1"><Mail className="size-3.5 text-ink" /> <T t={r.email} /></span>}
                {r.channels.includes("whatsapp") && <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5 text-ink" /> <T t={r.whatsapp} /></span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
