import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="border-t border-line bg-card pb-24 pt-8 md:pb-8">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo size={30} />
          <p className="mt-3 max-w-xs text-sm text-muted">
            Gupta Enterprises, Khedi Market, New NST, opposite Hotel Galaxy, Kohima, Nagaland 797001
          </p>
          <p className="mt-1 text-sm text-muted">
            Call <a className="font-semibold text-ink" href="tel:+917905529544">7905529544</a>
          </p>
          <p className="text-sm text-muted">Store open 10:00 to 17:30, deliveries 11:00 to 16:00</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Help</p>
          <ul className="mt-2 space-y-1.5 text-muted">
            <li><Link href="/policies/shipping" className="hover:text-ink">Delivery and pickup</Link></li>
            <li><Link href="/policies/cancellation" className="hover:text-ink">Cancellations</Link></li>
            <li><Link href="/policies/returns" className="hover:text-ink">Returns and refunds</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Legal</p>
          <ul className="mt-2 space-y-1.5 text-muted">
            <li><Link href="/policies/privacy" className="hover:text-ink">Privacy policy</Link></li>
            <li><Link href="/policies/terms" className="hover:text-ink">Terms of use</Link></li>
            <li>GSTIN 13CNAPG5572Q1ZP</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
