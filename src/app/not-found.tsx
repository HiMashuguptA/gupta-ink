import { getCategories } from "@/lib/catalog";
import { LostSign } from "@/components/notfound/LostSign";
import { PetNudge } from "@/components/pet/PetNudge";

export const metadata = { title: "Page not found", robots: { index: false } };

export default async function NotFound() {
  const categories = await getCategories().catch(() => []);
  return (<><LostSign categories={categories} /><PetNudge kind="lost" /></>);
}
