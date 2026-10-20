"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { uploadPhoto } from "@/lib/upload";
import { Sheet } from "@/components/ui/Sheet";
import { PhotoPicker } from "./PhotoPicker";

export type MyReview = { order_item_id: string; stars: number; comment: string | null; photos: string[] };
const WORDS = ["", "Poor", "Not great", "Okay", "Good", "Love it"];

export function ReviewDialog({ item, existing, onClose, onSaved }: {
  item: { id: string; name: string; image_url: string | null } | null; existing: MyReview | null; onClose: () => void; onSaved: (r: MyReview) => void;
}) {
  const sb = supabaseBrowser();
  const { user } = useSession();
  const toast = useToast();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStars(existing?.stars ?? 0); setComment(existing?.comment ?? ""); setFiles([]);
  }, [item, existing]);

  const save = async () => {
    if (!item || !user || !stars) return;
    setBusy(true);
    try {
      const added = await Promise.all(files.map((f) => uploadPhoto("reviews", user.id, f)));
      const photos = [...(existing?.photos ?? []), ...added].slice(-3);
      const { error } = await sb.rpc("submit_review", { p_item: item.id, p_stars: stars, p_comment: comment.trim() || undefined, p_photos: photos });
      if (error) throw new Error(error.message);
      onSaved({ order_item_id: item.id, stars, comment: comment.trim() || null, photos });
      toast({ kind: "ok", title: "Thanks for the review!" });
      onClose();
    } catch (e) {
      toast({ kind: "error", title: "Couldn't save", body: (e as Error).message });
    } finally { setBusy(false); }
  };

  const shown = hover || stars;
  return (
    <Sheet open={!!item} onClose={onClose} title={existing ? "Edit your review" : "Rate this item"}>
      {item && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image_url ?? "/brand/logo.svg"} alt="" className="size-12 rounded-lg" />
            <p className="font-semibold">{item.name}</p>
          </div>
          <div>
            <div className="flex gap-1" role="radiogroup" aria-label="Stars" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} className="p-1 transition-transform active:scale-90">
                  <Star className={clsx("size-9", n <= shown ? "fill-nib text-nib" : "text-line")} />
                </button>
              ))}
            </div>
            <p className="mt-1 h-5 text-sm font-semibold text-ink">{WORDS[shown]}</p>
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 1000))} rows={3} placeholder="What did you like or dislike? (optional)"
            className="w-full rounded-xl border border-line bg-paper p-3 text-sm outline-none focus:border-ink" aria-label="Review" />
          <PhotoPicker files={files} onChange={setFiles} max={Math.max(0, 3 - (existing?.photos.length ?? 0))} label="Photos (optional, up to 3)" />
          <p className="text-xs text-muted">Your first name and last initial show with the review.</p>
          <button onClick={save} disabled={!stars || busy} className="h-12 w-full rounded-xl bg-ink font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Submit review"}</button>
        </div>
      )}
    </Sheet>
  );
}
