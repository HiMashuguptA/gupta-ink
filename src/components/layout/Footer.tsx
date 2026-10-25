import Link from "next/link";
import { Phone, MapPin, Clock } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="mt-9 bg-sign pb-[calc(7rem+var(--island-pad,0px))] pt-9 text-on-sign md:mt-12 md:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo size={40} tone="sign" />
          <ul className="mt-4 space-y-2 text-sm text-on-sign-muted">
            <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-nib" /> Khedi Market, New NST, opposite Hotel Galaxy, Kohima, Nagaland 797001</li>
            <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-nib" /> <a className="font-bold text-on-sign hover:underline" href="tel:+917905529544">79055 29544</a></li>
            <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-nib" /> Store 10 am to 5:30 pm, deliveries 11 am to 4 pm</li>
          </ul>
        </div>
        <nav className="text-sm" aria-label="Help">
          <p className="sign-type text-[20px] text-nib">Help</p>
          <ul className="mt-2 space-y-2 text-on-sign-muted">
            <li><Link href="/policies/shipping" className="hover:text-on-sign">Delivery and pickup</Link></li>
            <li><Link href="/policies/cancellation" className="hover:text-on-sign">Cancellations</Link></li>
            <li><Link href="/policies/returns" className="hover:text-on-sign">Returns and refunds</Link></li>
          </ul>
        </nav>
        <nav className="text-sm" aria-label="Legal">
          <p className="sign-type text-[20px] text-nib">Legal</p>
          <ul className="mt-2 space-y-2 text-on-sign-muted">
            <li><Link href="/policies/privacy" className="hover:text-on-sign">Privacy policy</Link></li>
            <li><Link href="/policies/terms" className="hover:text-on-sign">Terms of use</Link></li>
            <li className="num">GSTIN 13CNAPG5572Q1ZP</li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
