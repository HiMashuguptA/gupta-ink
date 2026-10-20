import { supabaseServer } from "@/lib/supabase/server";
import { UserRoleTable } from "./UserRoleTable";

export const metadata = { title: "Users and roles" };

export default async function UsersPage() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from("profiles").select("id, name, email, phone, role, created_at").order("created_at", { ascending: false }).limit(500);
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Users and roles</h1>
      <p className="mt-1 text-sm text-muted">Make someone a delivery agent, add another admin, or block an account. Every change is logged.</p>
      <UserRoleTable users={data ?? []} me={user?.id ?? ""} />
    </div>
  );
}
