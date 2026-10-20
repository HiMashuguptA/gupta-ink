import { getSessionProfile } from "@/lib/supabase/server";
import { SettingsForm, type Settings } from "./SettingsForm";

export const metadata = { title: "Store settings" };

export default async function AdminSettings() {
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold">Store settings</h1>
      <p className="mt-1 text-sm text-muted">Hours, fees and rules. Checkout uses these at once; the database checks them again on every order.</p>
      {data ? <SettingsForm initial={data as unknown as Settings} /> : <p className="mt-4 text-sm text-margin">Couldn&apos;t load settings.</p>}
    </div>
  );
}
