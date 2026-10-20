"use server";
import { revalidateTag } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/server";

/** After an admin edits products, banners, sections or settings, drop the cached shop pages. */
export async function refreshCatalog() {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "admin") throw new Error("Admins only");
  revalidateTag("catalog");
}
