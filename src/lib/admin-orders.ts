/** Columns the admin orders board needs (customer name/phone and payment reference included). */
export const ADMIN_ORDER_SELECT =
  "id, order_no, status, type, payable_paise, payment_method, payment_status, created_at, slot_date, slot_start, slot_end, refund_due_paise, refunded_at, address, profiles!orders_user_id_fkey(name, phone), payments(utr, status)";
