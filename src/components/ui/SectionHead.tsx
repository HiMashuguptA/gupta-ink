import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";

/**
 * Section heading in sign lettering. "View all" rolls its words on hover (Skiper "Rolling text"),
 * hover only on devices that really hover. The rolling copy is drawn by CSS from data-roll, so
 * the link's real text reads once, and names where it goes ("View all: Top rated").
 */
export function SectionHead({ title, href, className, action = "View all", as: Heading = "h2" }: { title: string; href?: string; className?: string; action?: string; as?: "h1" | "h2" }) {
  return (
    <div className={clsx("mb-3 flex items-end justify-between gap-3", className)}>
      <Heading className="t-h3 uppercase leading-none text-graphite">{title}</Heading>
      {href && (
        <Link href={href} className="group press inline-flex shrink-0 items-center gap-1 rounded-md py-1 text-sm font-bold text-ink">
          <span data-roll={action}
            className="relative block overflow-hidden after:absolute after:inset-0 after:block after:translate-y-full after:transition-transform after:duration-300 after:ease-[var(--ease-out)] after:content-[attr(data-roll)] group-hover:after:translate-y-0 group-active:after:translate-y-0">
            <span className="block transition-transform duration-300 ease-[var(--ease-out)] group-hover:-translate-y-full group-active:-translate-y-full">{action}</span>
          </span>
          {title && <span className="sr-only">: {title}</span>}
          <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-active:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
