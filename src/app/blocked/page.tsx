import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export const metadata = { title: "Account suspended" };

export default function BlockedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-6">
      <div className="max-w-sm">
        <LogoMark size={56} />
        <h1 className="mt-4 text-[34px] uppercase">Your account is suspended</h1>
        <p className="mt-2 text-muted">
          You can&apos;t place orders right now. If you think this is a mistake, call the store on{" "}
          <a href="tel:+917905529544" className="font-semibold text-ink">7905529544</a> or email{" "}
          <a href="mailto:guptaenterpriseskohima@gmail.com" className="font-semibold text-ink">guptaenterpriseskohima@gmail.com</a>.
        </p>
        <Link href="/policies/terms" className="mt-4 inline-block text-sm font-semibold text-ink">Read our terms</Link>
      </div>
    </main>
  );
}
