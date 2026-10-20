import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Star } from "lucide-react";
import { getProduct } from "@/lib/catalog";
import { ProductDetail } from "@/components/shop/ProductDetail";
import { Rail } from "@/components/shop/Rail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product" };
  return { title: p.card.name, description: p.description ?? undefined, openGraph: { images: p.card.images.slice(0, 1) } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  return (
    <div className="pt-4">
      <div className="px-4">
        <Suspense>
          <ProductDetail card={p.card} description={p.description} returnable={p.card.returnable} />
        </Suspense>
      </div>

      <section id="reviews" className="mt-10 px-4">
        <h2 className="text-lg font-bold">Reviews</h2>
        {p.reviews.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No written reviews yet. Customers can review after their order is delivered.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {p.reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-card p-4">
                <p className="flex items-center gap-1" aria-label={`${r.stars} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${i < r.stars ? "fill-nib text-nib" : "text-line"}`} />)}
                </p>
                {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                {r.photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.photos.map((ph) => <img key={ph} src={ph} alt="Customer photo" className="size-16 rounded-lg object-cover" />)}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Rail title="Similar products" href={`/c/${p.card.category_slug}`} cards={p.similar} />
    </div>
  );
}
