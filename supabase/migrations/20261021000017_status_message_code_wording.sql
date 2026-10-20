-- Out-for-delivery message points to the in-app code
create or replace function public._status_message(st public.order_status, o public.orders) returns text[]
language sql immutable set search_path = '' as $$
  select case st
    when 'confirmed' then array['Order ' || o.order_no || ' confirmed', 'We''ll start packing it soon.']
    when 'getting_ready' then array['We''re getting your order ready', 'Picking your items off the shelf.']
    when 'packed' then array['Your order is packed', case when o.type = 'pickup' then 'Almost ready for pickup.' else 'A delivery partner will be assigned shortly.' end]
    when 'agent_assigned' then array['Delivery partner assigned', 'They''ll pick up your order from the store soon.']
    when 'agent_accepted' then array['Your delivery partner is on the way', 'You can follow them live on the map.']
    when 'out_for_delivery' then array['Out for delivery', 'Open your order to see your delivery code. We''ve emailed it too.']
    when 'delivered' then array['Delivered', 'Enjoy! You can rate your items or request a return within 3 days.']
    when 'ready_for_pickup' then array['Ready for pickup', 'Collect it at Khedi Market, opposite Hotel Galaxy, within 48 hours.']
    when 'collected' then array['Collected', 'Thanks for shopping with Gupta Ink!']
    when 'cancelled' then array['Order ' || o.order_no || ' cancelled', null]
    else array['Order ' || o.order_no || ' updated', null] end
$$;

