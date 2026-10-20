-- Gupta Ink: core schema
-- Money is stored in paise (integer). All money/stock/status writes go through
-- security definer functions; clients never write those columns directly.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------- enums
create type public.user_role as enum ('customer', 'admin', 'delivery_agent', 'blocked');
create type public.order_type as enum ('quick', 'scheduled', 'pickup');
create type public.payment_method as enum ('upi', 'cod', 'counter');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
create type public.order_status as enum (
  'placed', 'confirmed', 'getting_ready', 'packed',
  'agent_assigned', 'agent_accepted', 'out_for_delivery', 'delivered',
  'ready_for_pickup', 'collected',
  'completed', 'cancelled'
);
create type public.return_status as enum (
  'requested', 'approved', 'rejected', 'pickup_assigned', 'picked_up', 'received', 'refunded'
);
create type public.coupon_type as enum ('percent', 'flat', 'free_delivery');
create type public.coin_entry as enum ('earn', 'spend', 'expire', 'referral', 'restore', 'adjust');

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  phone text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  avatar_url text,
  role public.user_role not null default 'customer',
  referral_code text not null unique,
  referred_by uuid references public.profiles(id) on delete set null,
  referral_prompt_done boolean not null default false,
  welcome_seen boolean not null default false,
  terms_accepted_at timestamptz,
  blocked_reason text,
  agent_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles (role);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers (security definer so RLS policies can call them without recursion)
create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_agent() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'delivery_agent' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role <> 'blocked' from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------- settings (single row)
create table public.settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Gupta Ink',
  legal_name text not null default 'Gupta Enterprises',
  gstin text not null default '13CNAPG5572Q1ZP',
  store_address text not null default 'Khedi Market, New NST, opposite Hotel Galaxy, Kohima, Nagaland 797001',
  store_phone text not null default '7905529544',
  support_email text not null default 'guptaenterpriseskohima@gmail.com',
  store_lat double precision not null default 25.6680,
  store_lng double precision not null default 94.1085,
  store_upi_id text not null default 'himanshugupta123456@ybl',
  delivery_radius_km numeric not null default 15,
  min_order_paise int not null default 9900,
  delivery_fee_paise int not null default 4900,
  free_delivery_min_paise int not null default 49900,
  quick_eta_min int not null default 45,
  quick_eta_max int not null default 60,
  store_open time not null default '10:00',
  store_close time not null default '17:30',
  delivery_start time not null default '11:00',
  delivery_end time not null default '16:00',
  quick_last_order time not null default '15:00',
  slot_windows jsonb not null default '[{"start":"11:00","end":"13:00"},{"start":"13:00","end":"15:00"},{"start":"15:00","end":"16:00"}]',
  slot_capacity int not null default 10,
  slot_days_ahead int not null default 7,
  coin_rate_bp int not null default 200,          -- basis points: 200 = 2%
  coin_expiry_days int not null default 10,
  referral_reward_coins int not null default 50,
  free_cancels_per_week int not null default 3,
  cancel_fine_paise int not null default 3000,
  return_window_days int not null default 3,
  pickup_hold_hours int not null default 48,
  upi_daily_cap int not null default 20,
  cod_limit_paise int not null default 200000,
  orders_paused boolean not null default false,
  holidays date[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);
create trigger settings_updated before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- catalogue
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  icon text,
  parent_id uuid references public.categories(id) on delete set null,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.product_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid not null references public.categories(id),
  brand text,
  tags text[] not null default '{}',
  returnable boolean not null default true,
  seasonal_tag text,                       -- e.g. 'monsoon', 'back-to-school'
  rating_avg numeric(2,1) not null default 0,
  rating_count int not null default 0,
  sold_count int not null default 0,
  view_count int not null default 0,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_groups_trgm on public.product_groups using gin (search_text extensions.gin_trgm_ops);
create index on public.product_groups (category_id);
create trigger product_groups_updated before update on public.product_groups
  for each row execute function public.set_updated_at();

create or replace function public.product_groups_search_text() returns trigger
language plpgsql set search_path = '' as $$
declare cat text;
begin
  select name into cat from public.categories where id = new.category_id;
  new.search_text = lower(concat_ws(' ', new.name, new.brand, cat, array_to_string(new.tags, ' ')));
  return new;
end $$;
create trigger product_groups_search before insert or update of name, brand, tags, category_id
  on public.product_groups for each row execute function public.product_groups_search_text();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_groups(id) on delete cascade,
  sku text not null unique,
  variant_label text,                      -- e.g. 'Blue', 'Pack of 10'
  colour text,
  colour_hex text,
  unit text not null default 'piece',
  images text[] not null default '{}',
  mrp_paise int not null check (mrp_paise > 0),
  price_paise int not null check (price_paise > 0),
  gst_rate numeric(4,2) not null default 18,
  hsn text,
  stock int not null default 0 check (stock >= 0),
  low_stock_at int not null default 5,
  max_per_order int not null default 20,
  featured boolean not null default false,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_paise <= mrp_paise)
);
create index on public.products (group_id);
create index on public.products (featured) where featured;
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- Listing view: one row per product with group info and discount
create view public.product_cards with (security_invoker = true) as
select p.id, p.group_id, p.sku, p.variant_label, p.colour, p.colour_hex, p.unit, p.images,
       p.mrp_paise, p.price_paise, p.stock, p.max_per_order, p.featured,
       round(100.0 * (p.mrp_paise - p.price_paise) / p.mrp_paise)::int as discount_pct,
       g.name, g.slug, g.brand, g.tags, g.category_id, g.seasonal_tag, g.returnable,
       g.rating_avg, g.rating_count, g.sold_count, g.view_count, g.created_at,
       c.name as category_name, c.slug as category_slug
from public.products p
join public.product_groups g on g.id = p.group_id
join public.categories c on c.id = g.category_id
where p.active and c.active;

-- ---------------------------------------------------------------- home page content
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text not null,
  placement text not null default 'hero' check (placement in ('hero', 'promo', 'strip')),
  size text not null default 'full' check (size in ('full', 'half', 'compact')),
  link_type text not null check (link_type in ('product', 'category', 'search', 'featured', 'url')),
  link_value text,
  bg_color text,
  position int not null default 0,
  start_at timestamptz,
  end_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.home_sections (
  key text primary key,          -- featured, top_discounts, promos, categories, recent, top_rated, most_purchased, trending, seasonal
  title text not null,
  position int not null,
  visible boolean not null default true,
  config jsonb not null default '{}'
);

-- ---------------------------------------------------------------- per-user data
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  label text not null default 'Home',
  house_name text not null,
  road text not null,
  landmark text,
  contact_name text not null,
  contact_phone text not null check (contact_phone ~ '^[6-9][0-9]{9}$'),
  for_someone_else boolean not null default false,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  road_km numeric,                 -- set by server after OSRM check
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.addresses (user_id);

create table public.wishlist (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.recently_viewed (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  group_id uuid not null references public.product_groups(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

create table public.cart_items (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  qty int not null check (qty between 1 and 50),
  added_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- wallet & coins
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  coin_balance int not null default 0 check (coin_balance >= 0),
  pending_fine_paise int not null default 0 check (pending_fine_paise >= 0),
  week_start date not null default date_trunc('week', (now() at time zone 'Asia/Kolkata'))::date,
  week_cancels int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry public.coin_entry not null,
  amount int not null,                 -- positive = credit, negative = debit
  remaining int not null default 0,    -- for credits: coins left to spend
  order_id uuid,
  note text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.coin_ledger (user_id, created_at desc);
create index on public.coin_ledger (expires_at) where remaining > 0;

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referee_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'void')),
  first_order_id uuid,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_id <> referee_id)
);

-- ---------------------------------------------------------------- coupons
create table public.coupons (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  title text not null,
  description text,
  type public.coupon_type not null,
  value int not null default 0 check (value >= 0),   -- percent (1-100) or paise
  max_discount_paise int,
  min_order_paise int not null default 0,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  total_limit int,
  per_user_limit int not null default 1,
  used_count int not null default 0,
  audience text not null default 'all' check (audience in ('all', 'selected')),
  audience_user_ids uuid[] not null default '{}',
  first_order_only boolean not null default false,
  category_ids uuid[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (type <> 'percent' or value between 1 and 100)
);

create table public.coupon_uses (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.coupons(code),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null,
  discount_paise int not null,
  reverted boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.coupon_uses (code, user_id);

-- ---------------------------------------------------------------- orders
create table public.slot_bookings (
  slot_date date not null,
  window_start time not null,
  window_end time not null,
  booked int not null default 0,
  primary key (slot_date, window_start)
);

create sequence public.order_no_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('GI' || nextval('public.order_no_seq')),
  user_id uuid not null references public.profiles(id),
  type public.order_type not null,
  slot_date date,
  slot_start time,
  slot_end time,
  address jsonb,                         -- snapshot incl. lat/lng, contact
  road_km numeric,
  items_total_paise int not null,
  coupon_code text,
  coupon_discount_paise int not null default 0,
  coins_used int not null default 0,
  delivery_fee_paise int not null default 0,
  fine_paise int not null default 0,
  payable_paise int not null,
  coins_to_earn int not null default 0,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  status public.order_status not null default 'placed',
  agent_id uuid references public.profiles(id),
  otp_hash text,
  otp_attempts int not null default 0,
  note text,
  cancel_reason text,
  cancelled_by text,
  cancel_was_free boolean,
  ready_at timestamptz,
  delivered_at timestamptz,
  return_window_ends_at timestamptz,
  coins_credited boolean not null default false,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders (user_id, created_at desc);
create index on public.orders (status);
create index on public.orders (agent_id) where agent_id is not null;
create trigger orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name text not null,
  variant_label text,
  image_url text,
  mrp_paise int not null,
  price_paise int not null,
  qty int not null check (qty > 0),
  gst_rate numeric(4,2) not null,
  hsn text,
  returnable boolean not null default true,
  returned_qty int not null default 0,
  reviewed boolean not null default false
);
create index on public.order_items (order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  actor_id uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);
create index on public.order_events (order_id, created_at);

create table public.agent_locations (
  order_id uuid primary key references public.orders(id) on delete cascade,
  agent_id uuid not null references public.profiles(id),
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  amount_paise int not null,
  gateway_ref text,
  utr text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'expired', 'refunded')),
  reconciled_by uuid references public.profiles(id),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payments_utr_unique on public.payments (utr) where utr is not null;

-- ---------------------------------------------------------------- returns & reviews
create table public.returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  user_id uuid not null references public.profiles(id),
  items jsonb not null,                -- [{order_item_id, qty}]
  reason text not null check (length(reason) between 5 and 1000),
  photos text[] not null default '{}' check (array_length(photos, 1) between 1 and 5),
  refund_upi_id text not null check (refund_upi_id ~ '^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$'),
  refund_amount_paise int not null default 0,
  status public.return_status not null default 'requested',
  admin_note text,
  agent_id uuid references public.profiles(id),
  refund_proof_path text,
  refund_utr text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.returns (user_id);
create index on public.returns (status);
create trigger returns_updated before update on public.returns
  for each row execute function public.set_updated_at();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_groups(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_item_id uuid not null unique references public.order_items(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text check (comment is null or length(comment) <= 1000),
  photos text[] not null default '{}' check (coalesce(array_length(photos, 1), 0) <= 3),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.reviews (group_id, created_at desc);

-- ---------------------------------------------------------------- analytics & audit
create table public.search_logs (
  id bigint generated always as identity primary key,
  term text not null,
  results_count int not null,
  created_at timestamptz not null default now()
);
create index on public.search_logs (created_at);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  target text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  user_id uuid not null,
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, bucket, window_start)
);
