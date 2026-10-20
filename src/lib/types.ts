export type Role = "customer" | "admin" | "delivery_agent" | "blocked";

export type ProductCard = {
  id: string;
  group_id: string;
  sku: string;
  variant_label: string | null;
  colour: string | null;
  colour_hex: string | null;
  unit: string;
  images: string[];
  mrp_paise: number;
  price_paise: number;
  stock: number;
  max_per_order: number;
  featured: boolean;
  discount_pct: number;
  name: string;
  slug: string;
  brand: string | null;
  tags: string[];
  category_id: string;
  seasonal_tag: string | null;
  returnable: boolean;
  rating_avg: number;
  rating_count: number;
  sold_count: number;
  view_count: number;
  created_at: string;
  category_name: string;
  category_slug: string;
  variant_sort?: number;
};

/** One card per product group, with its variants attached. */
export type GroupCard = ProductCard & { variants: ProductCard[] };

export type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  icon: string | null;
  sort: number;
};

export type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  placement: "hero" | "promo" | "strip";
  size: "full" | "half" | "compact";
  link_type: "product" | "category" | "search" | "featured" | "url";
  link_value: string | null;
  bg_color: string | null;
  position: number;
};

export type HomeSection = { key: string; title: string; position: number; visible: boolean; config: Record<string, unknown> };

export type StoreSettings = {
  store_name: string;
  store_lat: number;
  store_lng: number;
  delivery_radius_km: number;
  min_order_paise: number;
  delivery_fee_paise: number;
  free_delivery_min_paise: number;
  quick_eta_min: number;
  quick_eta_max: number;
  store_open: string;
  store_close: string;
  delivery_start: string;
  delivery_end: string;
  quick_last_order: string;
  orders_paused: boolean;
  store_phone: string;
  support_email: string;
  store_address: string;
};

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: Role;
  referral_code: string;
  referral_prompt_done: boolean;
  welcome_seen: boolean;
  created_at: string;
};
