"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLive } from "@/lib/live";
import { CountBadge } from "@/components/ui/Num";

/** Bell with a live count of unread notifications. */
export function NotificationBell({ userId }: { userId: string }) {
  const [unread, setUnread] = useState(0);
  const path = usePathname();
  const load = useCallback(async () => {
    const { count } = await supabaseBrowser().from("notifications").select("id", { count: "exact", head: true })
      .eq("user_id", userId).is("read_at", null);
    setUnread(count ?? 0);
  }, [userId]);
  useEffect(() => { void load(); }, [load, path]);
  useEffect(() => {
    const f = () => void load();
    window.addEventListener("ge:notif", f);
    return () => window.removeEventListener("ge:notif", f);
  }, [load]);
  useLive(`bell-${userId}`, [{ table: "notifications", filter: `user_id=eq.${userId}` }], () => void load(), { waitMs: 400 });
  return (
    <Link href="/account/notifications" className="press relative grid size-10 place-items-center rounded-full hover:bg-white/10"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
      <Bell className="size-5" />
      <CountBadge value={unread} tone="margin" className="absolute -right-0.5 -top-0.5" />
    </Link>
  );
}
