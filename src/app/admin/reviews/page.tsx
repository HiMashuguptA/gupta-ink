import { Star } from "lucide-react";
import { getSessionProfile } from "@/lib/supabase/server";
import { storageUrl } from "@/lib/format";
import { HideReviewButton } from "./HideReviewButton";

export const metadata = { title: "Reviews" };

type Row = { id: string; stars: number; comment: string | null; photos: string[]; hidden: boolean; reviewer_name: string | null; created_at: string; product_groups: { name: string; slug: string } | null };

export default async function AdminReviews() {
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("reviews").select("id, stars, comment, photos, hidden, reviewer_name, created_at, product_groups(name, slug)")
    .order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as unknown as Row[];
  return (
    <div className="max-w-3xl">
      <h1 className="text-[34px] uppercase">Reviews</h1>
      <p className="mt-1 text-sm text-muted">Only verified buyers can review. Hide anything abusive or off-topic; ratings update straight away.</p>
      <ul className="mt-5 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className={`rounded-[12px] bg-card p-4 ${r.hidden ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <a href={`/p/${r.product_groups?.slug ?? ""}`} target="_blank" className="font-semibold text-ink hover:underline">{r.product_groups?.name ?? "Product"}</a>
                <p className="mt-0.5 flex items-center gap-0.5" aria-label={`${r.stars} stars`}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${i < r.stars ? "fill-nib text-nib" : "text-line"}`} />)}
                  <span className="ml-2 text-xs text-muted">{r.reviewer_name ?? "Customer"} · {new Date(r.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}</span>
                </p>
              </div>
              <HideReviewButton id={r.id} hidden={r.hidden} />
            </div>
            {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
            {r.photos.length > 0 && (
              <div className="mt-2 flex gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.photos.map((p) => <img key={p} src={storageUrl("reviews", p)} alt="Review photo" className="size-16 rounded-[8px] object-cover" />)}
              </div>
            )}
          </li>
        ))}
        {!rows.length && <li className="rounded-[12px] border border-dashed border-line p-6 text-center text-sm text-muted">No reviews yet.</li>}
      </ul>
    </div>
  );
}
