"use client";
import { SessionProvider, type SessionUser } from "./SessionProvider";
import { ToastProvider } from "./ToastProvider";
import type { Profile } from "@/lib/types";

/** Sign-in info and toasts for the admin panel and the delivery portal (no cart or location). */
export function StaffProviders({ user, profile, children }: { user: SessionUser; profile: Profile; children: React.ReactNode }) {
  return (
    <SessionProvider initialUser={user} initialProfile={profile}>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
