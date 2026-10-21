import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { StaffProviders } from "@/components/providers/StaffProviders";
import type { Profile } from "@/lib/types";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login?next=/agent");
  return <StaffProviders user={user} profile={profile as Profile}>{children}</StaffProviders>;
}
