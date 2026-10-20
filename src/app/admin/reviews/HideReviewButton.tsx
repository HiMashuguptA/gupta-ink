"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function HideReviewButton({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const flip = async () => {
    setBusy(true);
    const { error } = await supabaseBrowser().rpc("admin_hide_review", { p_review: id, p_hidden: !hidden });
    setBusy(false);
    if (!error) router.refresh();
  };
  return (
    <button onClick={flip} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold disabled:opacity-50">
      {hidden ? <><Eye className="size-4" /> Show</> : <><EyeOff className="size-4" /> Hide</>}
    </button>
  );
}
