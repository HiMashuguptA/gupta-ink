import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { LogoMark } from "@/components/brand/Logo";

export const metadata = { title: "Signing you in", robots: { index: false } };

/** Google sends people back here; Clerk finishes the sign-in and forwards them to where they were going. */
export default function SsoCallback() {
  return (
    <main className="grid min-h-dvh place-items-center bg-sign text-on-sign">
      <div className="grid justify-items-center gap-4">
        <LogoMark size={88} tone="yellow" swing />
        <p className="sign-type t-h4">Signing you in…</p>
      </div>
      <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" />
    </main>
  );
}
