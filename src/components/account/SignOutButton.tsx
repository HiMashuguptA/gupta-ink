"use client";
import { LogOut } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";

export function SignOutButton() {
  const { signOut } = useSession();
  return (
    <button onClick={signOut} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line font-semibold text-margin hover:bg-paper">
      <LogOut className="size-4" /> Sign out
    </button>
  );
}
