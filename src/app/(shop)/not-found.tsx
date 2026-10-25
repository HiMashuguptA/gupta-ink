import { getCategories } from "@/lib/catalog";
import { LostSign } from "@/components/notfound/LostSign";
import { PetNudge } from "@/components/pet/PetNudge";

export default async function ShopNotFound() {
  const categories = await getCategories().catch(() => []);
  return (<><LostSign categories={categories} compact /><PetNudge kind="lost" /></>);
}
