"use client";
import { Download, Printer } from "lucide-react";

export function PrintButton() {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white">
        <Download className="size-4" /> Download PDF
      </button>
      <button type="button" onClick={() => window.print()}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-semibold">
        <Printer className="size-4" /> Print
      </button>
    </div>
  );
}
