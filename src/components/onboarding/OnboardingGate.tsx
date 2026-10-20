"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { WelcomeFilm } from "./WelcomeFilm";
import { ReferralSheet } from "./ReferralSheet";

/** Decides which first-run moment to show after sign-in. */
export function OnboardingGate() {
  const { profile, refresh } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const [stage, setStage] = useState<"none" | "film" | "referral" | "back">("none");

  useEffect(() => {
    if (!profile) return;
    if (!profile.welcome_seen) setStage("film");
    else if (!profile.referral_prompt_done && Date.now() - new Date(profile.created_at).getTime() < 7 * 864e5) setStage("referral");
    else if (params.get("signedin") === "1") setStage("back");
  }, [profile, params]);

  const filmDone = useCallback(async () => {
    await supabaseBrowser().rpc("finish_onboarding", { p_skip_referral: false, p_welcome_seen: true });
    setStage(profile && !profile.referral_prompt_done ? "referral" : "none");
  }, [profile]);

  const referralDone = useCallback(async () => {
    setStage("none");
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (stage !== "back") return;
    const t = setTimeout(() => {
      setStage("none");
      const url = new URL(window.location.href);
      url.searchParams.delete("signedin");
      router.replace(url.pathname + url.search, { scroll: false });
    }, 2400);
    return () => clearTimeout(t);
  }, [stage, router]);

  return (
    <AnimatePresence>
      {stage === "film" && <WelcomeFilm key="film" name={profile?.name ?? ""} onDone={filmDone} />}
      {stage === "referral" && <ReferralSheet key="ref" onDone={referralDone} />}
      {stage === "back" && (
        <motion.div
          key="back"
          className="pointer-events-none fixed inset-x-0 top-20 z-[65] flex justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.2, borderRadius: 999 }}
            animate={{ scale: 1, borderRadius: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex items-center gap-3 bg-ink px-5 py-3.5 text-white shadow-xl shadow-ink/30"
          >
            <span className="font-hand text-2xl text-nib">Hello again,</span>
            <span className="font-display text-lg font-bold">{profile?.name?.split(" ")[0] ?? "friend"}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
