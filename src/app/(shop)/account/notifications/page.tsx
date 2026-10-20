import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { NotificationList } from "@/components/account/NotificationList";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { supabase, user } = await getSessionProfile();
  if (!user) redirect("/login?next=/account/notifications");
  const { data } = await supabase.from("notifications").select("id, type, title, body, link, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-extrabold">Notifications</h1>
      <NotificationList initial={data ?? []} userId={user.id} />
    </div>
  );
}
