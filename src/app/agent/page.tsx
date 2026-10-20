import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Agent portal" };

export default async function AgentHome() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login?next=/agent");
  if (profile.role !== "delivery_agent" && profile.role !== "admin") redirect("/");
  const { data: jobs } = await supabase.from("orders").select("id, order_no, status").eq("agent_id", user.id).not("status", "in", "(completed,cancelled,delivered)");
  return (
    <main className="mx-auto max-w-md p-4">
      <Logo size={30} />
      <h1 className="mt-4 text-2xl font-extrabold">Hi {profile.name?.split(" ")[0] ?? "there"}</h1>
      <p className="mt-1 text-muted">Assigned jobs, accept, live location and delivery OTP arrive in Phase 3.</p>
      <div className="mt-5 rounded-2xl border border-line bg-card p-4">
        <p className="text-sm text-muted">Active jobs</p>
        <p className="font-display text-3xl font-extrabold">{jobs?.length ?? 0}</p>
      </div>
      <Link href="/" className="mt-5 inline-block text-sm font-semibold text-ink">Back to shop</Link>
    </main>
  );
}
