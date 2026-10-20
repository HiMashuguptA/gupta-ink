import Link from "next/link";
import { linkFor } from "@/lib/format";
import type { Banner } from "@/lib/types";

export function PromoTiles({ promos }: { promos: Banner[] }) {
  if (!promos.length) return null;
  return (
    <section className="mt-7 px-4" aria-label="Quick picks">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {promos.map((p) => (
          <Link
            key={p.id}
            href={linkFor(p.link_type, p.link_value)}
            className="flex items-center justify-between gap-2 overflow-hidden rounded-2xl p-3 pr-0 transition-transform hover:-translate-y-0.5"
            style={{ background: p.bg_color ?? "var(--ink-soft)" }}
          >
            <span className="font-display text-[15px] font-bold leading-tight text-[#141c4d]">{p.title}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image_url} alt="" className="-mr-3 size-16 shrink-0 rounded-xl" loading="lazy" />
          </Link>
        ))}
      </div>
    </section>
  );
}
