"use client";
import { catalogChanged } from "@/app/actions/admin";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bike, CalendarClock, Store, Plus, Tag, Coins, Smartphone, Banknote, Check, ChevronDown, AlertCircle, X } from "lucide-react";
import clsx from "clsx";
import { useCart, lineFrom, type CartLine } from "@/components/providers/CartProvider";
import { Price } from "@/components/ui/Num";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import type { ProductCard } from "@/lib/types";
import { useToast } from "@/components/providers/ToastProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rupees } from "@/lib/format";
import { AddressCard } from "@/components/address/AddressCard";
import { AddressForm } from "@/components/address/AddressForm";
import { startNav } from "@/components/layout/NavProgress";
import type { SavedAddress } from "@/app/actions/addresses";

export type Slot = { slot_date: string; window_start: string; window_end: string; available: number; open: boolean; reason: string | null };
export type CouponOffer = { code: string; title: string; description: string | null; min_order_paise: number; type: string };
type Kind = "quick" | "scheduled" | "pickup";
type Method = "upi" | "cod" | "counter";
type Quote = {
  items_total_paise: number; mrp_total_paise: number; coupon: { code: string; title?: string; discount_paise?: number; free_delivery?: boolean; error?: string } | null;
  coupon_discount_paise: number; after_coupon_paise: number; delivery_fee_paise: number; free_delivery_min_paise: number; fine_paise: number;
  coins: { available: number; max: number; used: number }; payable_paise: number; coins_to_earn: number;
  availability: { quick: boolean; quick_reason: string | null; pickup: boolean; eta: string };
  methods: Record<Method, boolean>; cod_limit_paise: number; errors: string[];
};

const time12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "am" : "pm"}`;
};
function dayLabel(d: string, i: number) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  return new Date(d + "T12:00:00+05:30").toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });
}

export function CheckoutView({ addresses: initialAddresses, slots, coupons, radiusKm, storeAddress, storeHours, buyNow, profileName, profilePhone }: {
  addresses: SavedAddress[]; slots: Slot[]; coupons: CouponOffer[]; radiusKm: number; storeAddress: string; storeHours: string;
  buyNow?: { productId: string; qty: number } | null; profileName?: string | null; profilePhone?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const { lines: cartLines, removeMany } = useCart();
  const sb = supabaseBrowser();

  // Buy now: check out just this one item; the cart stays as it is
  const [buyLine, setBuyLine] = useState<CartLine | null>(null);
  const [buyMissing, setBuyMissing] = useState(false);
  useEffect(() => {
    if (!buyNow) return;
    let alive = true;
    void sb.from("product_cards").select("*").eq("id", buyNow.productId).maybeSingle().then(({ data }) => {
      if (!alive) return;
      const p = data as ProductCard | null;
      if (!p || p.stock <= 0) { setBuyMissing(true); return; }
      setBuyLine(lineFrom(p, Math.max(1, Math.min(buyNow.qty, p.max_per_order ?? 20, p.stock))));
    });
    return () => { alive = false; };
  }, [buyNow, sb]);
  const lines = useMemo(() => (buyNow ? (buyLine ? [buyLine] : []) : cartLines), [buyNow, buyLine, cartLines]);
  const count = lines.reduce((a, l) => a + l.qty, 0);

  // Store pickup: who collects, and a number the store can call
  const lastSelf = initialAddresses.find((a) => !a.for_someone_else);
  const [pickName, setPickName] = useState(profileName ?? lastSelf?.contact_name ?? "");
  const [pickPhone, setPickPhone] = useState((profilePhone ?? lastSelf?.contact_phone ?? "").replace(/\D/g, "").slice(-10));

  const [addresses, setAddresses] = useState(initialAddresses);
  const [kind, setKind] = useState<Kind>("quick");
  const [addressId, setAddressId] = useState<string | null>(
    (initialAddresses.find((a) => a.is_default && (a.road_km ?? 99) <= radiusKm) ?? initialAddresses.find((a) => (a.road_km ?? 99) <= radiusKm))?.id ?? null,
  );
  const days = useMemo(() => [...new Set(slots.map((s) => s.slot_date))], [slots]);
  const [day, setDay] = useState(() => slots.find((s) => s.open)?.slot_date ?? days[0]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [useCoins, setUseCoins] = useState(false);
  const [method, setMethod] = useState<Method | null>(null);
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [bump, setBump] = useState(0);
  const idem = useRef<string>(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));
  const firstQuote = useRef(true);

  const payload = useMemo(() => ({
    items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty })),
    type: kind,
    address_id: kind === "pickup" ? null : addressId,
    slot_date: kind === "scheduled" ? slot?.slot_date ?? null : null,
    slot_start: kind === "scheduled" ? slot?.window_start ?? null : null,
    coupon_code: coupon,
    use_coins: useCoins,
  }), [lines, kind, addressId, slot, coupon, useCoins]);

  // Live bill from the database; every change re-prices on the server
  useEffect(() => {
    if (!lines.length) return;
    setQuoting(true);
    const t = setTimeout(async () => {
      const { data, error } = await sb.rpc("quote_order", { p: payload });
      setQuoting(false);
      if (error) { toast({ kind: "error", title: "Couldn't update your bill", body: error.message }); return; }
      const q = data as unknown as Quote;
      setQuote(q);
      // First load: if quick delivery isn't running now, start on scheduled
      if (firstQuote.current) {
        firstQuote.current = false;
        if (!q.availability.quick && kind === "quick") setKind("scheduled");
      }
    }, firstQuote.current ? 0 : 250);
    return () => clearTimeout(t);
  }, [payload, sb, lines.length, toast, kind, bump]);

  // Keep the payment choice valid for this order
  useEffect(() => {
    if (!quote) return;
    const order: Method[] = kind === "pickup" ? ["counter", "upi"] : ["cod", "upi"];
    if (!method || !quote.methods[method]) setMethod(order.find((m) => quote.methods[m]) ?? null);
  }, [quote, kind, method]);

  // A rejected coupon is shown, then removed so it doesn't block the order
  const couponError = quote?.coupon?.error;
  const applyCoupon = (code: string) => { setCoupon(code.trim().toUpperCase() || null); setCouponInput(code.trim().toUpperCase()); };
  const removeCoupon = () => { setCoupon(null); setCouponInput(""); };

  const errors = useMemo(() => (quote?.errors ?? []).filter(Boolean), [quote]);
  const pickupOk = kind !== "pickup" || (pickName.trim().length >= 2 && /^[6-9]\d{9}$/.test(pickPhone));
  const blocking = errors.length > 0 || !!couponError || !method || quoting || !pickupOk;

  const place = useCallback(async () => {
    if (!quote || blocking || !method) return;
    setPlacing(true);
    const { data, error } = await sb.rpc("place_order", { p: { ...payload, payment_method: method, note, idempotency_key: idem.current,
      ...(kind === "pickup" ? { pickup_name: pickName.trim(), pickup_phone: pickPhone } : {}) } });
    if (error) {
      setPlacing(false);
      toast({ kind: "error", title: "Order not placed", body: error.message });
      setBump((b) => b + 1); // re-price: stock, slots or coupons may have changed
      return;
    }
    const r = data as { order_id: string };
    removeMany(lines.map((l) => l.product_id));
    void catalogChanged(); // stock moved
    startNav();
    router.replace(`/orders/${r.order_id}?placed=1`);
  }, [quote, blocking, method, sb, payload, note, toast, removeMany, lines, router, kind, pickName, pickPhone]);

  if (buyNow && !buyLine && !buyMissing) {
    return <div className="mx-auto max-w-5xl px-4 pt-4"><div className="skeleton h-10 w-48 rounded-[10px]" /><div className="skeleton mt-4 h-64 rounded-[12px]" /></div>;
  }
  if (!lines.length && !placing) {
    return (
      <div className="mx-4 mt-6 rounded-[16px] bg-sign p-7 text-on-sign">
        <h1 className="text-[40px] uppercase">Your cart is empty</h1>
        <p className="mt-1 text-on-sign-muted">Add a few things, then come back to check out.</p>
        <Link href="/" className="sign-type press mt-5 inline-flex h-12 items-center rounded-[10px] bg-nib px-5 text-[19px] text-on-nib">Start shopping</Link>
      </div>
    );
  }

  const daySlots = slots.filter((s) => s.slot_date === day);
  const kinds: { key: Kind; title: string; sub: string; icon: typeof Bike; disabled?: string | null }[] = [
    { key: "quick", title: "Quick delivery", sub: quote?.availability.eta ?? "45-60 min", icon: Bike, disabled: quote && !quote.availability.quick ? "Not running now" : null },
    { key: "scheduled", title: "Schedule", sub: "Pick a 2-hour slot", icon: CalendarClock },
    { key: "pickup", title: "Store pickup", sub: "Free, at Khedi Market", icon: Store },
  ];

  return (
    <div className="grid gap-6 px-4 pb-36 pt-4 lg:grid-cols-[1fr_380px] lg:pb-8">
      <div className="space-y-5">
        <h1 className="text-[40px] uppercase">Checkout</h1>

        {/* 1. How */}
        <Section title="How do you want it?">
          <div className="grid grid-cols-3 gap-1.5 rounded-[14px] bg-card p-1.5" role="radiogroup" aria-label="Delivery option">
            {kinds.map(({ key, title, sub, icon: Icon, disabled }) => (
              <button key={key} type="button" role="radio" aria-checked={kind === key} disabled={!!disabled}
                onClick={() => setKind(key)}
                className={clsx("press relative flex flex-col items-start gap-1 rounded-[10px] p-2.5 text-left disabled:opacity-45",
                  kind !== key && "hover:bg-sunk")}>
                {kind === key && <motion.span layoutId="kind-board" className="absolute inset-0 rounded-[10px] bg-sign" transition={{ type: "spring", duration: 0.4, bounce: 0.18 }} />}
                <Icon className={clsx("relative size-5 transition-colors", kind === key ? "text-nib" : "text-muted")} />
                <span className={clsx("relative text-sm font-bold leading-tight transition-colors", kind === key ? "text-on-sign" : "text-graphite")}>{title}</span>
                <span className={clsx("relative text-xs transition-colors", kind === key ? "text-on-sign-muted" : "text-muted")}>{disabled ?? sub}</span>
              </button>
            ))}
          </div>
          {kind !== "quick" && quote && !quote.availability.quick && quote.availability.quick_reason && (
            <p className="mt-2 text-xs text-muted">{quote.availability.quick_reason}</p>
          )}
        </Section>

        {/* 2. Where */}
        {kind !== "pickup" ? (
          <Section title="Deliver to">
            <div className="grid gap-2">
              {addresses.map((a) => {
                const out = (a.road_km ?? 99) > radiusKm;
                return (
                  <button key={a.id} type="button" onClick={() => !out && setAddressId(a.id)} disabled={out} className="text-left disabled:cursor-not-allowed" aria-pressed={addressId === a.id}>
                    <AddressCard a={a} radiusKm={radiusKm} selected={addressId === a.id}>
                      {addressId === a.id && <Check className="size-5 text-ink" />}
                    </AddressCard>
                  </button>
                );
              })}
              <button type="button" onClick={() => setFormOpen(true)} className="press flex h-12 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-ink/50 font-semibold text-ink hover:bg-ink-soft">
                <Plus className="size-4" /> {addresses.length ? "Add a new address" : "Add delivery address"}
              </button>
            </div>
          </Section>
        ) : (
          <Section title="Pick up from">
            <div className="flex gap-3 rounded-[12px] bg-card p-3.5">
              <Store className="mt-0.5 size-5 shrink-0 text-ink" />
              <div className="text-sm">
                <p className="font-semibold">Gupta Enterprises</p>
                <p className="text-muted">{storeAddress}</p>
                <p className="text-muted">Open {storeHours}. We&apos;ll tell you when it&apos;s ready; collect within 48 hours.</p>
              </div>
            </div>
            <div className="mt-3 rounded-[12px] bg-card p-3.5">
              <p className="text-sm font-semibold">Who will collect it?</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-muted">Name
                  <input value={pickName} onChange={(e) => setPickName(e.target.value.slice(0, 80))} autoComplete="name" placeholder="Full name"
                    className="mt-1 h-11 w-full rounded-[10px] border border-line bg-paper px-3 text-sm font-normal text-graphite outline-none focus:border-ink" />
                </label>
                <label className="text-xs font-semibold text-muted">Mobile number
                  <div className="mt-1 flex h-11 items-center rounded-[10px] border border-line bg-paper focus-within:border-ink">
                    <span className="pl-3 text-sm text-muted">+91</span>
                    <input value={pickPhone} onChange={(e) => setPickPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="tel" autoComplete="tel-national" placeholder="10-digit mobile"
                      className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-normal text-graphite outline-none" />
                  </div>
                </label>
              </div>
              {!pickupOk && <p className="mt-2 text-xs font-semibold text-margin">Add the name and a 10-digit mobile number so the store can call when it&apos;s ready.</p>}
            </div>
          </Section>
        )}

        {/* 3. When */}
        {kind === "scheduled" && (
          <Section title="Choose a slot">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
              {days.map((d, i) => {
                const anyOpen = slots.some((s) => s.slot_date === d && s.open);
                return (
                  <button key={d} type="button" onClick={() => { setDay(d); setSlot(null); }} aria-pressed={day === d} disabled={!anyOpen}
                    className={clsx("press shrink-0 rounded-[10px] px-3.5 py-2 text-sm font-semibold disabled:opacity-40",
                      day === d ? "bg-sign text-on-sign" : "bg-card text-graphite hover:bg-sunk")}>
                    {dayLabel(d, i)}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {daySlots.map((s) => {
                const on = slot?.slot_date === s.slot_date && slot.window_start === s.window_start;
                return (
                  <button key={s.window_start} type="button" disabled={!s.open} onClick={() => setSlot(s)} aria-pressed={on}
                    className={clsx("press rounded-[10px] px-3 py-2.5 text-left ring-2 disabled:opacity-45",
                      on ? "bg-nib-soft ring-nib" : "bg-card ring-transparent hover:bg-sunk")}>
                    <span className="num block text-sm font-bold">{time12(s.window_start)} to {time12(s.window_end)}</span>
                    <span className={clsx("block text-xs", s.open && s.available <= 3 ? "font-semibold text-margin" : "text-muted")}>{s.open ? (s.available <= 3 ? `${s.available} left` : "Available") : s.reason}</span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* 4. Items */}
        {buyNow && <p className="rounded-[10px] bg-nib-soft px-3 py-2 text-sm">Buying this item now. Your cart stays as it is.</p>}
        <Section title={`Items (${count})`}>
          <button type="button" onClick={() => setShowItems((v) => !v)} className="flex w-full items-center gap-2 rounded-[12px] bg-card p-3" aria-expanded={showItems}>
            <span className="flex -space-x-2">
              {lines.slice(0, 5).map((l) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={l.product_id} src={l.image ?? "/brand/logo.svg"} alt="" className="size-10 rounded-[8px] border-2 border-card bg-white" />
              ))}
            </span>
            <span className="ml-1 text-sm text-muted">{lines.length > 5 ? `+${lines.length - 5} more` : ""}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-ink">{showItems ? "Hide" : "View"} <ChevronDown className={clsx("size-4 transition-transform", showItems && "rotate-180")} /></span>
          </button>
          <AnimatePresence initial={false}>
            {showItems && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", duration: 0.4, bounce: 0.15 }} className="mt-2 divide-y divide-line overflow-hidden rounded-[12px] bg-card">
                {lines.map((l) => (
                  <li key={l.product_id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span className="min-w-0"><span className="block truncate font-semibold">{l.name}</span><span className="text-muted">{l.variant_label} × {l.qty}</span></span>
                    <span className="num font-semibold">{rupees(l.price_paise * l.qty)}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </Section>

        {/* 5. Offers */}
        <Section title="Offers">
          {coupon && !couponError && quote?.coupon ? (
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.4, bounce: 0.3 }} className="flex items-center gap-3 rounded-[12px] bg-ok/12 p-3 ring-1 ring-ok/30">
              <Tag className="size-5 text-ok" />
              <div className="flex-1 text-sm">
                <p className="font-bold">{quote.coupon.code} applied</p>
                <p className="text-muted">{quote.coupon.free_delivery ? "Free delivery on this order" : `You save ${rupees(quote.coupon.discount_paise ?? 0)}`}</p>
              </div>
              <button type="button" onClick={removeCoupon} className="grid size-8 place-items-center rounded-full hover:bg-card" aria-label="Remove coupon"><X className="size-4" /></button>
            </motion.div>
          ) : (
            <>
              <form onSubmit={(e) => { e.preventDefault(); applyCoupon(couponInput); }} className="flex gap-2">
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))}
                  placeholder="Coupon code" aria-label="Coupon code"
                  className="h-11 min-w-0 flex-1 rounded-[10px] bg-card px-3 font-semibold tracking-wider outline-none ring-2 ring-transparent focus:ring-nib" />
                <button disabled={!couponInput} className="press h-11 rounded-[10px] bg-sign px-4 text-sm font-bold text-on-sign disabled:opacity-40">Apply</button>
              </form>
              {couponError && (
                <p className="mt-2 flex items-center justify-between gap-2 rounded-[10px] bg-margin/10 px-3 py-2 text-sm text-margin" role="alert">
                  {couponError}
                  <button type="button" onClick={removeCoupon} className="font-semibold underline">Remove</button>
                </p>
              )}
              {coupons.length > 0 && (
                <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
                  {coupons.map((c) => (
                    <button key={c.code} type="button" onClick={() => applyCoupon(c.code)}
                      className="press w-56 shrink-0 rounded-[12px] border-[1.5px] border-dashed border-nib-deep/60 bg-nib-soft p-3 text-left">
                      <span className="sign-type block text-[19px] text-graphite">{c.code}</span>
                      <span className="block text-sm font-semibold">{c.title}</span>
                      {c.description && <span className="block text-xs text-muted">{c.description}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </Section>

        {/* 6. Coins */}
        {quote && quote.coins.available > 0 && (
          <Section title="SuperCoins">
            <label className={clsx("flex items-center gap-3 rounded-[12px] bg-card p-3", quote.coins.max === 0 && "opacity-60")}>
              <Coins className="size-5 text-nib" />
              <span className="flex-1 text-sm">
                <span className="block font-semibold">Use {quote.coins.max} of your {quote.coins.available} coins</span>
                <span className="text-muted">{quote.coins.max > 0 ? `Save ${rupees(quote.coins.max * 100)} on this order` : "Add more items to use coins"}</span>
              </span>
              <input type="checkbox" checked={useCoins} disabled={quote.coins.max === 0} onChange={(e) => setUseCoins(e.target.checked)} className="size-5 accent-[var(--ink)]" />
            </label>
          </Section>
        )}

        {/* 7. Pay */}
        <Section title="Pay with">
          <div className="grid gap-2" role="radiogroup" aria-label="Payment method">
            {([
              { key: "upi", title: "UPI", sub: "GPay, PhonePe, Paytm or any UPI app", icon: Smartphone, hide: false,
                off: quote && !quote.methods.upi ? "UPI is busy today. Choose another option." : null },
              { key: "cod", title: "Cash on delivery", sub: "Pay the delivery partner in cash or UPI", icon: Banknote, hide: kind === "pickup",
                off: quote && !quote.methods.cod ? `Available for orders up to ${rupees(quote.cod_limit_paise)}` : null },
              { key: "counter", title: "Pay at the counter", sub: "Pay when you collect", icon: Store, hide: kind !== "pickup", off: null },
            ] as const).filter((m) => !m.hide).map(({ key, title, sub, icon: Icon, off }) => (
              <button key={key} type="button" role="radio" aria-checked={method === key} disabled={!!off} onClick={() => setMethod(key)}
                className={clsx("press flex items-center gap-3 rounded-[12px] bg-card p-3 text-left ring-2 transition-[box-shadow,background-color] duration-200 disabled:opacity-50",
                  method === key ? "ring-ink" : "ring-transparent hover:bg-sunk")}>
                <Icon className="size-5 text-ink" />
                <span className="flex-1"><span className="block text-sm font-bold">{title}</span><span className="block text-xs text-muted">{off ?? sub}</span></span>
                <span className={clsx("grid size-5 place-items-center rounded-full border-2 transition-colors", method === key ? "border-ink bg-ink" : "border-rule")}>
                  <AnimatePresence>{method === key && <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", duration: 0.3, bounce: 0.4 }}><Check className="size-3 text-on-ink" strokeWidth={3.5} /></motion.span>}</AnimatePresence>
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Note for the store (optional)">
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={2} placeholder="e.g. Call when you reach the gate"
            className="w-full rounded-[12px] bg-card p-3 text-sm outline-none ring-2 ring-transparent focus:ring-nib" />
        </Section>
      </div>

      {/* Bill */}
      <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Bill" aria-busy={quoting}>
        <div className="rounded-[12px] bg-card p-4">
          <h2 className="text-[24px] uppercase">Bill details</h2>
          {!quote ? (
            <div className="mt-3 space-y-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-4" />)}</div>
          ) : (
            <dl className={clsx("mt-3 space-y-2 text-sm transition-opacity", quoting && "opacity-60")}>
              <Row label="Items (MRP)" value={rupees(quote.mrp_total_paise)} />
              {quote.mrp_total_paise > quote.items_total_paise && <Row label="Store discount" value={`−${rupees(quote.mrp_total_paise - quote.items_total_paise)}`} good />}
              {quote.coupon_discount_paise > 0 && <Row label={`Coupon ${quote.coupon?.code}`} value={`−${rupees(quote.coupon_discount_paise)}`} good />}
              {quote.coins.used > 0 && <Row label="SuperCoins" value={`−${rupees(quote.coins.used * 100)}`} good />}
              <Row label={kind === "pickup" ? "Pickup" : "Delivery fee"} value={quote.delivery_fee_paise ? rupees(quote.delivery_fee_paise) : "Free"} good={!quote.delivery_fee_paise} />
              {kind !== "pickup" && quote.delivery_fee_paise > 0 && (
                <p className="text-xs text-muted">Free delivery on {rupees(quote.free_delivery_min_paise)}+. Add {rupees(quote.free_delivery_min_paise - quote.after_coupon_paise)} more.</p>
              )}
              {quote.fine_paise > 0 && <Row label="Cancellation fine (earlier order)" value={rupees(quote.fine_paise)} />}
              <div className="flex items-baseline justify-between border-t border-line pt-2.5"><dt className="font-bold">To pay</dt><dd><Price paise={quote.payable_paise} className="sign-type text-[30px]" /></dd></div>
              {quote.coins_to_earn > 0 && (
                <p className="flex items-center gap-1.5 rounded-[8px] bg-nib-soft px-2.5 py-1.5 text-xs">
                  <Coins className="size-3.5 text-nib" /> You&apos;ll earn {quote.coins_to_earn} SuperCoins 3 days after delivery
                </p>
              )}
            </dl>
          )}
          {errors.length > 0 && (
            <ul className="mt-3 space-y-1.5" role="alert">
              {errors.map((e) => <li key={e} className="flex gap-2 text-sm text-margin"><AlertCircle className="mt-0.5 size-4 shrink-0" />{e}</li>)}
            </ul>
          )}
          <SlideToConfirm className="mt-4 hidden lg:block" label="Slide to place order" onConfirm={place}
            disabled={blocking && !placing} busy={placing} disabledLabel={quoting ? "Updating your bill" : errors[0] ?? (couponError ? "Remove the coupon" : !pickupOk ? "Add who will collect it" : "Choose how to pay")}
            sub={quote ? <>Pay <Price paise={quote.payable_paise} /></> : undefined} />
          <p className="mt-2 text-center text-xs text-muted">
            By placing the order you agree to our <Link href="/policies/terms" className="underline">terms</Link> and <Link href="/policies/cancellation" className="underline">cancellation policy</Link>.
          </p>
        </div>
      </aside>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-card px-3 py-2.5 lg:hidden">
        <SlideToConfirm label="Slide to place order" onConfirm={place}
          disabled={blocking && !placing} busy={placing} disabledLabel={quoting ? "Updating your bill" : errors[0] ?? (couponError ? "Remove the coupon" : !pickupOk ? "Add who will collect it" : "Choose how to pay")}
          sub={quote ? <>Pay <Price paise={quote.payable_paise} /></> : undefined} />
      </div>

      <AddressForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={(a, info) => {
        setAddresses((l) => [a, ...l.filter((x) => x.id !== a.id)]);
        setFormOpen(false);
        if (info.inRange) { setAddressId(a.id); toast({ kind: "ok", title: "Address saved", body: `${a.road_km?.toFixed(1)} km from the store by road.` }); }
        else toast({ kind: "info", title: "Outside our delivery area", body: `That's ${a.road_km?.toFixed(1)} km by road. Choose store pickup instead.` });
      }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-[22px] uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex justify-between gap-3"><dt className="text-muted">{label}</dt><dd className={clsx("num font-semibold", good && "text-ok")}>{value}</dd></div>
  );
}
