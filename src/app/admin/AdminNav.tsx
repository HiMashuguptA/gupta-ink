"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import clsx from "clsx";
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
    <aside className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur md:static md:min-h-dvh md:border-b-0 md:border-r md:p-4">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 md:block md:p-0">
        <Link href="/admin" className="flex items-center gap-2"><Logo size={28} /><span className="rounded-md bg-ink-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink md:hidden">Admin</span></Link>
        <p className="mt-1 hidden text-xs font-semibold text-muted md:block">Store admin</p>
        <Link href="/" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted hover:bg-ink-soft md:hidden"><Store className="size-4" /> Shop</Link>
      </div>
      <nav ref={bar} className="no-scrollbar mt-2 flex gap-1 overflow-x-auto px-3 pb-2 md:mt-4 md:flex-col md:px-0 md:pb-0" aria-label="Admin sections">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
            className={clsx("shrink-0 rounded-lg px-3 py-2 text-sm font-semibold", active(n.href) ? "bg-ink text-white md:bg-ink-soft md:text-ink" : "text-graphite hover:bg-ink-soft")}>{n.label}</Link>
        ))}
        <Link href="/" className="hidden shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-ink-soft md:block">Back to shop</Link>
      </nav>
    </aside>
  );
}
