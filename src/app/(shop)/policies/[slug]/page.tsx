import Link from "next/link";
import { notFound } from "next/navigation";
import { POLICIES, POLICY_UPDATED, getPolicy } from "@/content/policies";

export function generateStaticParams() {
  return POLICIES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPolicy(slug);
  return { title: p?.title ?? "Policy", description: p?.summary };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPolicy(slug);
  if (!p) notFound();
  return (
    <div className="grid gap-8 px-4 pt-6 md:grid-cols-[200px_1fr]">
      <nav aria-label="Policies" className="min-w-0 md:sticky md:top-28 md:self-start">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto md:flex-col md:gap-1">
          {POLICIES.map((x) => (
            <li key={x.slug}>
              <Link href={`/policies/${x.slug}`} aria-current={x.slug === p.slug ? "page" : undefined}
                className={`block shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${x.slug === p.slug ? "bg-ink-soft text-ink" : "text-muted hover:text-graphite"}`}>
                {x.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="max-w-[68ch]">
        <h1 className="text-3xl font-extrabold">{p.title}</h1>
        <p className="mt-2 text-muted">{p.summary}</p>
        <p className="mt-1 text-xs text-muted">Last updated {POLICY_UPDATED}</p>
        {p.sections.map((s) => (
          <section key={s.heading} className="mt-7">
            <h2 className="text-lg font-bold">{s.heading}</h2>
            {s.body.map((para, i) => <p key={i} className="mt-2 leading-relaxed">{para}</p>)}
          </section>
        ))}
      </article>
    </div>
  );
}
