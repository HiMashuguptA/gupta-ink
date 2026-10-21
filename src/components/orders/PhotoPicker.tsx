"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

/** Lets people pick a few photos and preview them before upload. */
export function PhotoPicker({ files, onChange, max, label }: { files: File[]; onChange: (f: File[]) => void; max: number; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [files]);

  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div key={u} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`Photo ${i + 1}`} className="size-20 rounded-xl object-cover" />
            <button type="button" onClick={() => onChange(files.filter((_, k) => k !== i))} aria-label={`Remove photo ${i + 1}`}
              className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-ink text-white"><X className="size-3.5" /></button>
          </div>
        ))}
        {files.length < max && (
          <button type="button" onClick={() => input.current?.click()}
            className="grid size-20 place-items-center rounded-xl border-[1.5px] border-dashed border-line text-muted hover:border-ink hover:text-ink">
            <span className="grid justify-items-center gap-1 text-xs font-semibold"><Camera className="size-5" /> Add</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple hidden
        onChange={(e) => { const add = Array.from(e.target.files ?? []); onChange([...files, ...add].slice(0, max)); e.target.value = ""; }} />
    </div>
  );
}
