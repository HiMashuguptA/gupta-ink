"use client";
import { useSynced } from "@/lib/live";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

type U = { id: string; name: string | null; email: string; phone: string | null; role: Role; created_at: string };
const LABELS: Record<Role, string> = { customer: "Customer", admin: "Admin", delivery_agent: "Delivery agent", blocked: "Blocked" };
const OWNER = "premiumservice9366@gmail.com";

export function UserRoleTable({ users: initial, me }: { users: U[]; me: string }) {
  const [users, setUsers] = useSynced(initial);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? users.filter((u) => `${u.name ?? ""} ${u.email} ${u.phone ?? ""}`.toLowerCase().includes(t)) : users;
  }, [users, q]);

  const change = async (u: U, role: Role) => {
    let reason: string | null = null;
    if (role === "blocked") {
      reason = window.prompt(`Why are you blocking ${u.name ?? u.email}? They will see this is a suspension.`);
      if (!reason) return;
    }
    const { error } = await supabaseBrowser().rpc("admin_set_role", { p_user: u.id, p_role: role, p_reason: reason ?? undefined });
    if (error) return setMsg({ ok: false, text: error.message });
    setUsers((all) => all.map((x) => (x.id === u.id ? { ...x, role } : x)));
    setMsg({ ok: true, text: `${u.name ?? u.email} is now ${LABELS[role].toLowerCase()}.` });
  };

  return (
    <div className="mt-5">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or phone" aria-label="Search users"
        className="h-11 w-full max-w-md rounded-xl border border-line bg-card px-3 outline-none focus:border-ink" />
      {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-ok" : "text-margin"}`} role="status">{msg.text}</p>}
      <ul className="mt-4 grid gap-2.5 md:hidden">
        {shown.map((u) => {
          const locked = u.email === OWNER || u.id === me;
          return (
            <li key={u.id} className="rounded-2xl border border-line bg-card p-3.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{u.name ?? "Not set"}</p>
                  <p className="truncate text-muted">{u.email}</p>
                  <p className="text-xs text-muted">{u.phone ?? "No phone"} · joined {new Date(u.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
                </div>
                <div className="shrink-0 text-right">
                  <select value={u.role} disabled={locked} onChange={(e) => void change(u, e.target.value as Role)} aria-label={`Role for ${u.name ?? u.email}`}
                    className="h-9 rounded-lg border border-line bg-paper px-2 font-semibold disabled:opacity-60">
                    {(Object.keys(LABELS) as Role[]).map((r) => <option key={r} value={r}>{LABELS[r]}</option>)}
                  </select>
                  {locked && <p className="mt-1 text-xs text-muted">{u.email === OWNER ? "Store owner" : "You"}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-line bg-card md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-muted"><th className="p-3 font-semibold">Name</th><th className="p-3 font-semibold">Email</th><th className="p-3 font-semibold">Phone</th><th className="p-3 font-semibold">Joined</th><th className="p-3 font-semibold">Role</th></tr>
          </thead>
          <tbody>
            {shown.map((u) => {
              const locked = u.email === OWNER || u.id === me;
              return (
                <tr key={u.id} className="border-t border-line">
                  <td className="p-3 font-semibold">{u.name ?? "Not set"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.phone ?? "Not set"}</td>
                  <td className="p-3">{new Date(u.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                  <td className="p-3">
                    <select value={u.role} disabled={locked} onChange={(e) => void change(u, e.target.value as Role)}
                      aria-label={`Role for ${u.name ?? u.email}`}
                      className="h-9 rounded-lg border border-line bg-paper px-2 font-semibold disabled:opacity-60">
                      {(Object.keys(LABELS) as Role[]).map((r) => <option key={r} value={r}>{LABELS[r]}</option>)}
                    </select>
                    {locked && <span className="ml-2 text-xs text-muted">{u.email === OWNER ? "Store owner" : "You"}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
