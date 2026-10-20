import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { getSettings } from "@/lib/catalog";
import { istNow } from "@/lib/hours";
import { AGENT_JOB_SELECT } from "@/lib/agent";
import { AgentPortal, type Job } from "./AgentPortal";

export const metadata = { title: "Deliveries" };

export default async function AgentHome() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login?next=/agent");
  if (profile.role !== "delivery_agent" && profile.role !== "admin") redirect("/");

  const today = `${istNow().date}T00:00:00+05:30`;
  const [jobs, done, settings, me] = await Promise.all([
    supabase.from("orders").select(AGENT_JOB_SELECT).eq("agent_id", user.id)
      .in("status", ["agent_assigned", "agent_accepted", "out_for_delivery"]).order("created_at"),
    supabase.from("orders").select("id, order_no, payable_paise, payment_method, delivered_at").eq("agent_id", user.id)
      .eq("status", "delivered").gte("delivered_at", today).order("delivered_at", { ascending: false }),
    getSettings(),
    supabase.from("profiles").select("agent_online").eq("id", user.id).single(),
  ]);

  return (
    <AgentPortal
      agentId={user.id}
      name={profile.name?.split(" ")[0] ?? "there"}
      isAgent={profile.role === "delivery_agent"}
      initialOnline={Boolean(me.data?.agent_online)}
      initialJobs={(jobs.data ?? []) as unknown as Job[]}
      doneToday={(done.data ?? []) as { id: string; order_no: string; payable_paise: number; payment_method: string; delivered_at: string }[]}
      storePhone={settings?.store_phone ?? "7905529544"}
      shop={{ lat: settings?.store_lat ?? 25.6669, lng: settings?.store_lng ?? 94.1086 }}
    />
  );
}
