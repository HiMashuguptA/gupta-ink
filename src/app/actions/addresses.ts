"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSessionProfile } from "@/lib/supabase/server";
import { getSettings } from "@/lib/catalog";
import { roadDistanceKm, round6, signDistance } from "@/lib/distance";

const schema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(30).default("Home"),
  house_name: z.string().trim().min(2, "Enter the house or building name").max(120),
  road: z.string().trim().min(2, "Enter the road or area").max(160),
  landmark: z.string().trim().max(160).optional().nullable(),
  contact_name: z.string().trim().min(2, "Enter the name of the person receiving the order").max(60),
  contact_phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"),
  for_someone_else: z.boolean().default(false),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  is_default: z.boolean().default(false),
});

export type AddressInput = z.input<typeof schema>;
export type SavedAddress = {
  id: string; label: string; house_name: string; road: string; landmark: string | null;
  contact_name: string; contact_phone: string; for_someone_else: boolean; lat: number; lng: number;
  road_km: number | null; is_default: boolean;
};
type Result =
  | { ok: true; address: SavedAddress; inRange: boolean; approx: boolean; radiusKm: number }
  | { ok: false; error: string; field?: string };

/** Saves an address and records its signed road distance from the store. */
export async function saveAddress(input: AddressInput): Promise<Result> {
  const { supabase, user } = await getSessionProfile();
  if (!user) return { ok: false, error: "Please sign in again" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i.message, field: String(i.path[0] ?? "") };
  }
  const a = parsed.data;
  const settings = await getSettings();
  const store = { lat: settings?.store_lat ?? 25.668, lng: settings?.store_lng ?? 94.1085 };
  const radiusKm = Number(settings?.delivery_radius_km ?? 15);

  const lat = round6(a.lat), lng = round6(a.lng);
  const { km, approx } = await roadDistanceKm(store, { lat, lng });
  const id = a.id ?? randomUUID();
  const row = {
    id, user_id: user.id, label: a.label, house_name: a.house_name, road: a.road, landmark: a.landmark || null,
    contact_name: a.contact_name, contact_phone: a.contact_phone, for_someone_else: a.for_someone_else,
    lat, lng, road_km: km, distance_sig: signDistance(id, lat, lng, km), distance_at: new Date().toISOString(),
    is_default: a.is_default,
  };

  if (a.is_default) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { data, error } = a.id
    ? await supabase.from("addresses").update(row).eq("id", a.id).eq("user_id", user.id).select().single()
    : await supabase.from("addresses").insert(row).select().single();
  if (error || !data) return { ok: false, error: "Couldn't save the address. Please try again." };

  return { ok: true, address: data as SavedAddress, inRange: km <= radiusKm, approx, radiusKm };
}

export async function deleteAddress(id: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getSessionProfile();
  if (!user || !z.string().uuid().safeParse(id).success) return { ok: false };
  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  return { ok: !error };
}
