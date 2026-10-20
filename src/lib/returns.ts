export type ReturnStatus = "requested" | "approved" | "rejected" | "pickup_assigned" | "picked_up" | "received" | "refunded";

export type ReturnItem = { order_item_id: string; name: string; variant_label: string | null; image_url: string | null; qty: number; unit_refund_paise: number };

export type ReturnRow = {
  id: string; order_id: string; user_id: string; items: ReturnItem[]; reason: string; photos: string[];
  refund_upi_id: string; refund_amount_paise: number; status: ReturnStatus; admin_note: string | null;
  agent_id: string | null; refund_proof_path: string | null; refund_utr: string | null; refunded_at: string | null;
  pickup_address: { contact_name: string; contact_phone: string; house_name: string; road: string; landmark?: string | null; lat: number; lng: number } | null;
  restocked: boolean; created_at: string; updated_at: string;
};

export const RETURN_LABEL: Record<ReturnStatus, string> = {
  requested: "Requested", approved: "Approved", rejected: "Not approved", pickup_assigned: "Pickup arranged",
  picked_up: "Picked up", received: "Received at store", refunded: "Refunded",
};

export const RETURN_STEPS: ReturnStatus[] = ["requested", "approved", "picked_up", "received", "refunded"];

export function returnTone(s: ReturnStatus) {
  if (s === "rejected") return "bg-margin/10 text-margin";
  if (s === "refunded") return "bg-ok/10 text-ok";
  if (s === "requested") return "bg-nib-soft text-ink-deep";
  return "bg-ink-soft text-ink";
}
