"use client";
import { useState } from "react";
import { z } from "zod";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  phone: z.union([z.literal(""), z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number")]),
});

export function ProfileForm() {
  const { profile, refresh } = useSession();
  const toast = useToast();
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, phone });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabaseBrowser().from("profiles")
      .update({ name: parsed.data.name, phone: parsed.data.phone || null }).eq("id", profile!.id);
    setBusy(false);
    if (error) return toast({ kind: "error", title: "Couldn't save your details", body: error.message });
    await refresh();
    toast({ kind: "ok", title: "Details saved" });
  };

  return (
    <form onSubmit={save} className="grid gap-4 rounded-2xl border border-line bg-card p-4" noValidate>
      <div>
        <label htmlFor="name" className="text-sm font-semibold">Name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:border-ink" aria-invalid={!!errors.name} />
        {errors.name && <p className="mt-1 text-sm text-margin">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="phone" className="text-sm font-semibold">Mobile number</label>
        <div className="mt-1.5 flex h-11 items-center rounded-xl border border-line bg-paper focus-within:border-ink">
          <span className="pl-3 text-muted">+91</span>
          <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="tel-national"
            className="h-full flex-1 bg-transparent px-2 outline-none" aria-invalid={!!errors.phone} />
        </div>
        {errors.phone && <p className="mt-1 text-sm text-margin">{errors.phone}</p>}
      </div>
      <div>
        <p className="text-sm font-semibold">Email</p>
        <p className="mt-1 text-sm text-muted">{profile?.email} (from your Google account)</p>
      </div>
      <button disabled={busy} className="h-11 rounded-xl bg-ink font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save details"}</button>
    </form>
  );
}
