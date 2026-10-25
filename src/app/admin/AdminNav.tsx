"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Store } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function AdminNav({ nav }: { nav: { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const bar = useRef<HTMLElement>(null);
  // Phones: keep the current section's tab in view
  useEffect(() => {
    bar.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);
  return (
    <aside className="sticky top-0 z-30 bg-sign text-on-sign md:sticky md:h-dvh md:overflow-y-auto md:p-4">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 md:block md:p-0">
        <Link href="/admin" className="flex items-center gap-2"><Logo size={32} tone="sign" /><span className="sign-type rounded-[5px] bg-nib px-1.5 pb-0.5 pt-1 text-[13px] text-on-nib md:hidden">Admin</span></Link>
        <p className="sign-type mt-3 hidden text-[15px] text-nib md:block">Store admin</p>
        <Link href="/" className="press inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-xs font-semibold text-on-sign-muted hover:bg-white/10 md:hidden"><Store className="size-4" /> Shop</Link>
      </div>
      <nav ref={bar} className="no-scrollbar mt-2 flex scroll-px-3 gap-1 overflow-x-auto px-3 pb-2 [mask-image:linear-gradient(90deg,transparent,#000_14px,#000_calc(100%-24px),transparent)] md:mt-4 md:flex-col md:px-0 md:pb-0 md:[mask-image:none]" aria-label="Admin sections">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
            className={clsx("press relative shrink-0 rounded-[8px] px-3 py-2 text-sm font-semibold", active(n.href) ? "text-on-nib" : "text-on-sign-muted hover:bg-white/10 hover:text-on-sign")}>
            {active(n.href) && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-[8px] bg-nib" transition={{ type: "spring", duration: 0.4, bounce: 0.15 }} />}
            <span className="relative">{n.label}</span></Link>
        ))}
        <Link href="/" className="hidden shrink-0 rounded-[8px] px-3 py-2 text-sm font-semibold text-on-sign-muted hover:bg-white/10 md:block">Back to shop</Link>
      </nav>
    </aside>
  );
}
