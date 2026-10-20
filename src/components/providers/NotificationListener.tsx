"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "./SessionProvider";
import { useToast } from "./ToastProvider";

/** Pops a toast (with a bell swing) whenever a new notification arrives for this user. */
export function NotificationListener() {
  const { user } = useSession();
  const toast = useToast();
  useEffect(() => {
    if (!user) return;
    const sb = supabaseBrowser();
    const ch = sb.channel(`notif-toast-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => {
          const n = p.new as { title: string; body: string | null };
          toast({ kind: "info", title: n.title, body: n.body ?? undefined });
          if ("vibrate" in navigator) navigator.vibrate?.(60);
        })
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [user, toast]);
  return null;
}
