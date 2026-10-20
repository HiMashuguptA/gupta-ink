"use client";
import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { AddressCard } from "@/components/address/AddressCard";
import { AddressForm } from "@/components/address/AddressForm";
import { deleteAddress, type SavedAddress } from "@/app/actions/addresses";
import { useToast } from "@/components/providers/ToastProvider";

export function AddressBook({ initial, radiusKm }: { initial: SavedAddress[]; radiusKm: number }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  const remove = async (a: SavedAddress) => {
    if (!confirm(`Delete the "${a.label}" address?`)) return;
    const res = await deleteAddress(a.id);
    if (res.ok) { setList((l) => l.filter((x) => x.id !== a.id)); toast({ kind: "ok", title: "Address deleted" }); }
    else toast({ kind: "error", title: "Couldn't delete the address" });
  };

  return (
    <div className="grid max-w-2xl gap-3">
      {list.map((a) => (
        <AddressCard key={a.id} a={a} radiusKm={radiusKm}>
          <div className="flex flex-col gap-1">
            <button onClick={() => { setEditing(a); setOpen(true); }} className="grid size-9 place-items-center rounded-lg hover:bg-paper" aria-label={`Edit ${a.label} address`}><Pencil className="size-4" /></button>
            <button onClick={() => remove(a)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-paper hover:text-margin" aria-label={`Delete ${a.label} address`}><Trash2 className="size-4" /></button>
          </div>
        </AddressCard>
      ))}
      {!list.length && (
        <div className="ruled rounded-3xl p-6 pl-14">
          <p className="font-bold">No saved addresses yet</p>
          <p className="text-sm text-muted">Add one now, or at checkout. We check the road distance so you know delivery is possible.</p>
        </div>
      )}
      <button onClick={() => { setEditing(null); setOpen(true); }} className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-ink font-semibold text-ink">
        <Plus className="size-4" /> Add address
      </button>
      <AddressForm open={open} initial={editing} onClose={() => setOpen(false)}
        onSaved={(a, info) => {
          setList((l) => {
            const rest = l.filter((x) => x.id !== a.id).map((x) => (a.is_default ? { ...x, is_default: false } : x));
            return [a, ...rest];
          });
          setOpen(false);
          toast(info.inRange ? { kind: "ok", title: "Address saved", body: `${a.road_km?.toFixed(1)} km from the store by road.` }
            : { kind: "info", title: "Saved, but outside delivery area", body: `It's ${a.road_km?.toFixed(1)} km by road. Store pickup is still available.` });
        }} />
    </div>
  );
}
