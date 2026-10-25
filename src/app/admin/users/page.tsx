import { getSessionProfile } from "@/lib/supabase/server";
import { UserRoleTable } from "./UserRoleTable";

export const metadata = { title: "Users and roles" };

export default async function UsersPage() {
  const { supabase: sb, user } = await getSessionProfile();
  const { data } = await sb.from("profiles").select("id, name, email, phone, role, created_at").order("created_at", { ascending: false }).limit(500);
  return (
    <div>
      <h1 className="text-[34px] uppercase">Users and roles</h1>
      <p className="mt-1 text-sm text-muted">Make someone a delivery agent, add another admin, or block an account. Every change is logged.</p>
      <UserRoleTable users={data ?? []} me={user?.id ?? ""} />
    </div>
  );
}
