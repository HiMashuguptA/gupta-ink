"use client";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

const INR = { style: "currency", currency: "INR", maximumFractionDigits: 2 } as const;

/** A rupee amount (in paise) whose digits roll when it changes (Skiper "Number flow"). */
export function Price({ paise, className }: { paise: number; className?: string }) {
  // Whole rupees show no decimals; anything with paise shows two (₹889.10, never ₹889.1)
  return <NumberFlow value={paise / 100} format={{ ...INR, minimumFractionDigits: paise % 100 ? 2 : 0 }} locales="en-IN" className={clsx("num", className)} willChange />;
}

/** Any count that should roll: coins, quantities, totals. */
export function Num({ value, className, prefix, suffix }: { value: number; className?: string; prefix?: string; suffix?: string }) {
  return <NumberFlow value={value} locales="en-IN" prefix={prefix} suffix={suffix} className={clsx("num", className)} />;
}

/** Cart / notification count bubble: pops in, digits roll, pops out at zero. */
export function CountBadge({ value, className, tone = "nib" }: { value: number; className?: string; tone?: "nib" | "margin" }) {
  return (
    <AnimatePresence>
      {value > 0 && (
        <motion.span key="badge" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.35 }}
          className={clsx("grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold leading-none ring-2 ring-sign",
            tone === "nib" ? "bg-nib text-on-nib" : "bg-margin text-white", className)}>
          <NumberFlow value={Math.min(value, 99)} className="num" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
