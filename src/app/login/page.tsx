import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";
import { LoginScreen } from "./LoginScreen";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const { user } = await getSessionProfile();
  if (user) redirect(next);
  return <LoginScreen next={next} error={sp.error ? "Sign-in didn't finish. Please try again." : undefined} />;
}
