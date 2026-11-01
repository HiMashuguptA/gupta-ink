"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

const IMAGE = /^image\/(jpe?g|png|webp)$/i;

/**
 * Drop photos onto this area (or paste them while it's on screen) to upload.
 * Wraps any content; a dashed ring and a "Drop to upload" note show while a file is dragged over it.
 */
export function DropZone({ onFiles, disabled, paste, className, children }: {
  onFiles: (files: File[]) => void; disabled?: boolean; paste?: boolean; className?: string; children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const take = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []).filter((f) => IMAGE.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
    if (files.length && !disabled) onFiles(files);
  };

  // Paste a copied image (Ctrl/Cmd+V) anywhere on the page
  useEffect(() => {
    if (!paste || disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true]")) return;
      if (e.clipboardData?.files.length) { e.preventDefault(); take(e.clipboardData.files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  return (
    <div
      onDragEnter={(e) => { if (!e.dataTransfer.types.includes("Files")) return; e.preventDefault(); depth.current += 1; setOver(true); }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); e.dataTransfer.dropEffect = disabled ? "none" : "copy"; } }}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
      onDrop={(e) => { if (!e.dataTransfer.types.includes("Files")) return; e.preventDefault(); depth.current = 0; setOver(false); take(e.dataTransfer.files); }}
      className={clsx("relative rounded-[12px] transition-[box-shadow,background-color] duration-150", over && !disabled && "bg-nib-soft/50 ring-2 ring-dashed ring-ink ring-offset-2 ring-offset-card", className)}>
      {children}
      {over && !disabled && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center rounded-[12px] bg-card/70 text-sm font-bold text-ink">Drop to upload</span>
      )}
    </div>
  );
}
