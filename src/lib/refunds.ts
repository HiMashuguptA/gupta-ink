import "server-only";
import type { SupabaseLike } from "./refunds-types";

export type GatewayRefundRow = { id: string; amount_paise: number; status: "queued" | "pending" | "success" | "failed"; return_id: string | null; error: string | null; updated_at: string };

/** Refunds sent back through Cashfree for one order (not in the generated database types yet). */
export async function gatewayRefunds(sb: SupabaseLike, orderId: string): Promise<GatewayRefundRow[]> {
  const q = (sb.from("gateway_refunds" as never) as unknown as {
    select: (s: string) => { eq: (c: string, v: string) => { order: (c: string) => Promise<{ data: GatewayRefundRow[] | null }> } };
  });
  const { data } = await q.select("id, amount_paise, status, return_id, error, updated_at").eq("order_id", orderId).order("created_at");
  return data ?? [];
}

/** Paid through Cashfree (so refunds can go back automatically). */
export async function paidOnline(sb: SupabaseLike, orderId: string) {
  const { data } = await sb.from("payments").select("gateway_ref, status").eq("order_id", orderId).maybeSingle();
  return !!data?.gateway_ref && ["success", "refunded"].includes(data.status ?? "");
}
