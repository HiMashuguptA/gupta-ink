import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { getSettings } from "@/lib/catalog";
import { AddressBook } from "./AddressBook";
import type { SavedAddress } from "@/app/actions/addresses";

export const metadata = { title: "Saved addresses" };

export default async function AddressesPage() {
  const [{ supabase, user }, settings] = await Promise.all([getSessionProfile(), getSettings()]);
  if (!user) redirect("/login?next=/account/addresses");
  const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-extrabold">Saved addresses</h1>
      <AddressBook initial={(data ?? []) as SavedAddress[]} radiusKm={Number(settings?.delivery_radius_km ?? 15)} />
    </div>
  );
}
