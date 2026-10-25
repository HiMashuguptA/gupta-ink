"use client";
import { useMemo, useRef, useState } from "react";
import { X, Plus } from "lucide-react";

const clean = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} &-]/gu, "").slice(0, 30);

/** Tags as chips: type and press Enter or comma, or pick one already used on other products. */
export function TagInput({ value, onChange, suggestions, id }: { value: string[]; onChange: (t: string[]) => void; suggestions: string[]; id: string }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const add = (raw: string) => {
    const parts = raw.split(",").map(clean).filter(Boolean);
    if (!parts.length) return;
    onChange([...new Set([...value, ...parts])].slice(0, 25));
    setText("");
  };
  const matches = useMemo(() => {
    const q = clean(text);
    return suggestions.filter((s) => !value.includes(s) && (!q || s.includes(q))).slice(0, 8);
  }, [text, suggestions, value]);
  const fresh = clean(text) && !suggestions.includes(clean(text)) && !value.includes(clean(text));

  return (
    <div className="relative mt-1">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[8px] border border-line bg-paper px-2 py-1.5 focus-within:border-ink" onClick={() => input.current?.focus()}>
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-ink-soft px-2.5 py-0.5 text-xs font-semibold text-ink">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X className="size-3" /></button>
          </span>
        ))}
        <input ref={input} id={id} value={text} placeholder={value.length ? "Add another" : "Type a tag and press Enter"}
          onChange={(e) => { const v = e.target.value; if (v.includes(",")) add(v); else setText(v); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(text); }
            else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-7 min-w-28 flex-1 bg-transparent text-sm font-normal outline-none focus-visible:outline-none" autoComplete="off" />
      </div>
      {open && (matches.length > 0 || fresh) && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-[10px] border border-line bg-card p-1 text-sm font-normal shadow-float" role="listbox">
          {fresh && (
            <li><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(text)} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left font-semibold text-ink hover:bg-ink-soft">
              <Plus className="size-4" /> Create tag &ldquo;{clean(text)}&rdquo;</button></li>
          )}
          {matches.map((m) => (
            <li key={m}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(m)} className="w-full rounded-[8px] px-3 py-2 text-left hover:bg-ink-soft">{m}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
