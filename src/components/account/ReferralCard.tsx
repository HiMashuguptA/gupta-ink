"use client";
import { Copy, Share2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export function ReferralCard({ code }: { code: string }) {
  const toast = useToast();
  const text = `Order stationery from Gupta Enterprises, Kohima, delivered in under an hour. Use my code ${code} when you sign up and we both get 50 SuperCoins after your first order.`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Gupta Enterprises", text, url: window.location.origin });
      else { await navigator.clipboard.writeText(`${text} ${window.location.origin}`); toast({ kind: "ok", title: "Invite copied", body: "Paste it into WhatsApp or a message." }); }
    } catch { /* user cancelled share */ }
  };
  return (
    <div className="rounded-[12px] bg-nib-soft p-4">
      <p className="text-sm font-semibold">Invite friends, earn 50 SuperCoins each</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-display text-2xl font-extrabold tracking-[0.15em] text-ink">{code}</span>
        <button onClick={async () => { await navigator.clipboard.writeText(code); toast({ kind: "ok", title: "Code copied" }); }} className="grid size-9 place-items-center rounded-[8px] hover:bg-ink-soft" aria-label="Copy referral code">
          <Copy className="size-4" />
        </button>
      </div>
      <button onClick={share} className="mt-3 inline-flex items-center gap-2 rounded-[10px] bg-ink px-4 py-2.5 text-sm font-semibold text-on-ink">
        <Share2 className="size-4" /> Share invite
      </button>
    </div>
  );
}
