import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";

/**
 * Section heading in sign lettering. "View all" rolls its words on hover (Skiper "Rolling text"),
 * hover only on devices that really hover.
 */
export function SectionHead({ title, href, className, action = "View all" }: { title: string; href?: string; className?: string; action?: string }) {
  return (
    <div className={clsx("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="text-[26px] uppercase leading-none text-graphite">{title}</h2>
      {href && (
        <Link href={href} className="group press inline-flex shrink-0 items-center gap-1 rounded-md py-1 text-sm font-bold text-ink">
          <span className="relative block overflow-hidden">
            <span className="block transition-transform duration-300 ease-[var(--ease-out)] group-hover:-translate-y-full">{action}</span>
            <span className="absolute inset-0 block translate-y-full transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-y-0" aria-hidden>{action}</span>
          </span>
          <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
