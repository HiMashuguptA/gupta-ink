export type OrderStatus =
  | "placed" | "confirmed" | "getting_ready" | "packed" | "agent_assigned" | "agent_accepted"
  | "out_for_delivery" | "delivered" | "ready_for_pickup" | "collected" | "completed" | "cancelled";

export type OrderRow = {
  id: string; order_no: string; user_id: string; type: "quick" | "scheduled" | "pickup"; status: OrderStatus;
  slot_date: string | null; slot_start: string | null; slot_end: string | null;
  address: { label?: string; house_name: string; road: string; landmark?: string | null; contact_name: string; contact_phone: string; lat: number; lng: number; for_someone_else?: boolean } | null;
  road_km: number | null; items_total_paise: number; coupon_code: string | null; coupon_discount_paise: number; coins_used: number;
  delivery_fee_paise: number; fine_paise: number; payable_paise: number; coins_to_earn: number;
  payment_method: "upi" | "cod" | "counter"; payment_status: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  agent_id: string | null; note: string | null; cancel_reason: string | null; cancelled_by: string | null; refund_due_paise: number; refund_upi_id: string | null; refund_utr?: string | null; refund_proof_path?: string | null; refunded_at?: string | null;
  created_at: string; delivered_at: string | null; return_window_ends_at: string | null; ready_at: string | null;
};
export type OrderItem = { id: string; product_id: string; name: string; variant_label: string | null; image_url: string | null; price_paise: number; mrp_paise: number; qty: number };
export type OrderEvent = { id: number; status: string; note: string | null; created_at: string };

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed", confirmed: "Confirmed", getting_ready: "Getting ready", packed: "Packed",
  agent_assigned: "Partner assigned", agent_accepted: "Partner on the way", out_for_delivery: "Out for delivery",
  delivered: "Delivered", ready_for_pickup: "Ready for pickup", collected: "Collected", completed: "Completed", cancelled: "Cancelled",
};

/** The steps a customer sees, in order. "Partner on the way" is folded into "Out for delivery". */
export function stepsFor(type: OrderRow["type"]): { key: OrderStatus; label: string; also?: OrderStatus[] }[] {
  const start = [
    { key: "placed" as const, label: "Order placed" },
    { key: "confirmed" as const, label: "Confirmed" },
    { key: "getting_ready" as const, label: "Getting ready" },
    { key: "packed" as const, label: "Packed" },
  ];
  if (type === "pickup") return [...start, { key: "ready_for_pickup", label: "Ready for pickup" }, { key: "collected", label: "Collected", also: ["completed"] }];
  return [...start, { key: "agent_assigned", label: "Partner assigned", also: ["agent_accepted"] },
    { key: "out_for_delivery", label: "Out for delivery" }, { key: "delivered", label: "Delivered", also: ["completed"] }];
}

export const CANCELLABLE: OrderStatus[] = ["placed", "confirmed", "getting_ready", "packed", "agent_assigned", "agent_accepted", "ready_for_pickup"];

export function statusTone(s: OrderStatus) {
  if (s === "cancelled") return "bg-margin/10 text-margin";
  if (s === "delivered" || s === "collected" || s === "completed") return "bg-ok/10 text-ok";
  if (s === "placed") return "bg-nib-soft text-ink-deep";
  return "bg-ink-soft text-ink";
}

export function when(o: Pick<OrderRow, "type" | "slot_date" | "slot_start" | "slot_end">) {
  if (o.type === "pickup") return "Store pickup";
  if (o.type === "quick") return "Quick delivery";
  if (!o.slot_date || !o.slot_start) return "Scheduled";
  const d = new Date(o.slot_date + "T12:00:00+05:30").toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });
  const t = (x: string) => { const [h, m] = x.split(":").map(Number); return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "am" : "pm"}`; };
  return `${d}, ${t(o.slot_start)} to ${t(o.slot_end ?? o.slot_start)}`;
}
