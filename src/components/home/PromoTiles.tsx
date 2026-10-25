import { Link } from "next-view-transitions";
import clsx from "clsx";
import { linkFor } from "@/lib/format";
import type { Banner } from "@/lib/types";

// Small painted boards in the sign palette; the admin's own colour wins when set to something other than the old defaults
const BOARDS = ["bg-sign text-on-sign", "bg-nib text-on-nib", "bg-card text-graphite", "bg-[#cf1f2b] text-white"];

export function PromoTiles({ promos }: { promos: Banner[] }) {
  if (!promos.length) return null;
  return (
    <section className="mt-9 px-4" aria-label="Quick picks">
      <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {promos.map((p, k) => (
          <li key={p.id} className="reveal" style={{ "--i": k } as React.CSSProperties}>
            <Link href={linkFor(p.link_type, p.link_value)}
              className={clsx("press group relative flex h-[92px] items-center justify-between gap-1 overflow-hidden rounded-[12px] py-3 pl-3.5", BOARDS[k % BOARDS.length])}>
              <span className="sign-type relative z-10 max-w-[56%] text-[21px]">{p.title}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt="" loading="lazy" className="absolute bottom-2.5 right-2.5 size-[62px] rotate-[-6deg] rounded-[10px] transition-transform duration-500 ease-[var(--ease-out)] group-hover:rotate-0 group-hover:scale-105" />
              
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
