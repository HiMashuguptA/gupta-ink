"use server";
import { revalidateTag } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/server";

/** After an admin edits products, banners, sections or settings, drop the cached shop pages. */
export async function refreshCatalog() {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "admin") throw new Error("Admins only");
  revalidateTag("catalog");
}

// Shop-side changes (orders move stock, reviews move ratings) refresh the cache too,
// but at most every few seconds so a busy hour doesn't thrash it.
let lastCatalog = 0;
let lastReviews = 0;

/** Stock or sold counts changed (order placed, cancelled, restocked). Signed-in users only. */
export async function catalogChanged() {
  const { user } = await getSessionProfile();
  if (!user) return;
  if (Date.now() - lastCatalog < 3000) return;
  lastCatalog = Date.now();
  revalidateTag("catalog");
}

/** A review was added, edited or hidden: product pages and ratings show it straight away. */
export async function reviewsChanged() {
  const { user } = await getSessionProfile();
  if (!user) return;
  if (Date.now() - lastReviews < 1000) return;
  lastReviews = Date.now();
  revalidateTag("reviews");
  revalidateTag("catalog");
}
