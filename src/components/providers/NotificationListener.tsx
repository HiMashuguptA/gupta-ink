"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "./SessionProvider";
import { useToast } from "./ToastProvider";

/** Pops a toast (with a bell swing) whenever a new notification arrives for this user. */
export function NotificationListener() {
  const { user } = useSession();
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (!user) return;
    const sb = supabaseBrowser();
    const ch = sb.channel(`notif-toast-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => {
          const n = p.new as { id: string; title: string; body: string | null; link: string | null };
          window.dispatchEvent(new Event("ge:notif"));
          window.dispatchEvent(new CustomEvent("ge:pet", { detail: { kind: "notify" } }));
          // Tapping the toast opens it and marks it read
          toast({ kind: "info", title: n.title, body: n.body ?? undefined, onClick: () => {
            void sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id).then(() => window.dispatchEvent(new Event("ge:notif")));
            if (n.link) router.push(n.link);
          } });
          if ("vibrate" in navigator) navigator.vibrate?.(60);
        })
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [user, toast, router]);
  return null;
}
