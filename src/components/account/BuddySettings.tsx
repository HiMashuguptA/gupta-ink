"use client";
import { useState } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PETS, petSay } from "@/lib/pet";
import { Sheet } from "@/components/ui/Sheet";
import { PetArt } from "@/components/pet/PetArt";
import { BuddyPicker } from "@/components/pet/BuddyPicker";

/** Account card: see, rename, switch or hide your shop buddy. */
export function BuddySettings() {
  const { profile, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!profile) return <div className="skeleton h-[148px] rounded-[12px]" />;

  const meta = PETS.find((p) => p.kind === profile.pet);
  const current = profile.pet_name || meta?.name || "";
  const value = name ?? current;

  const save = async (args: { p_name?: string; p_hidden?: boolean }) => {
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().rpc("set_buddy", { p_name: args.p_name, p_hidden: args.p_hidden });
    setBusy(false);
    if (error) return setMsg(error.message);
    await refresh();
    setName(null);
    if (args.p_name) { setMsg("Saved."); setTimeout(() => petSay({ kind: "hello", name: args.p_name }), 400); }
    if (args.p_hidden === false) setTimeout(() => petSay({ kind: "hello" }), 900);
  };

  return (
    <div className="rounded-[12px] bg-card p-4">
      {profile.pet && meta ? (
        <>
          <div className="flex items-center gap-3">
            <span className="grid size-[68px] shrink-0 place-items-center rounded-[14px] bg-sunk"><PetArt kind={profile.pet} mood={profile.pet_hidden ? "sleepy" : "happy"} blink={false} size={58} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[22px] font-extrabold uppercase leading-none">{current}</p>
              <p className="text-sm text-muted">{meta.species}{profile.pet_hidden ? " · napping (hidden)" : " · out shopping with you"}</p>
            </div>
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (value.trim() && value.trim() !== current) void save({ p_name: value.trim() }); }}>
            <label htmlFor="buddy-rename" className="sr-only">Buddy name</label>
            <input id="buddy-rename" value={value} maxLength={20} onChange={(e) => setName(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-card px-3 font-semibold text-graphite caret-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/15" />
            <button disabled={busy || !value.trim() || value.trim() === current} className="press h-11 rounded-[10px] bg-ink px-4 text-sm font-bold text-on-ink disabled:opacity-40">Rename</button>
          </form>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => setOpen(true)} className="press inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-sunk text-sm font-semibold hover:bg-ink-soft"><Sparkles className="size-4 text-ink" /> Change buddy</button>
            <button onClick={() => void save({ p_hidden: !profile.pet_hidden })} disabled={busy} className="press inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-sunk text-sm font-semibold hover:bg-ink-soft">
              {profile.pet_hidden ? <><Eye className="size-4 text-ink" /> Bring back</> : <><EyeOff className="size-4 text-ink" /> Hide for now</>}
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <span className="grid size-[68px] shrink-0 place-items-center rounded-[14px] bg-sunk"><PetArt kind="mochi" mood="curious" blink={false} size={58} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">No buddy yet</p>
            <p className="text-sm text-muted">Pick a little friend to shop with.</p>
          </div>
          <button onClick={() => setOpen(true)} className="press h-11 rounded-[10px] bg-nib px-4 text-sm font-bold text-on-nib">Choose</button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-muted" role="status">{msg}</p>}
      <Sheet open={open} onClose={() => setOpen(false)} title={profile.pet ? "Change buddy" : "Pick a shop buddy"}>
        <BuddyPicker asSheet current={profile.pet ?? null} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  );
}
