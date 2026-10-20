"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLive } from "@/lib/live";

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
  useLive(`bell-${userId}`, [{ table: "notifications", filter: `user_id=eq.${userId}` }], () => void load(), { waitMs: 400 });
  return (
    <Link href="/account/notifications" className="relative grid size-10 place-items-center rounded-full hover:bg-ink-soft"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
      <Bell className="size-5 text-graphite" />
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-margin px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}
