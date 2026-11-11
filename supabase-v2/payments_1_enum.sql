-- UPI/online orders wait here until the money arrives; the store never sees them as orders before that.
alter type public.order_status add value if not exists 'awaiting_payment' before 'placed';
