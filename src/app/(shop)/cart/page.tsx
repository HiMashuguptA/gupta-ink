import { getSettings } from "@/lib/catalog";
import { CartView } from "@/components/cart/CartView";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const s = await getSettings();
  return (
    <CartView
      rules={{
        min_order_paise: s?.min_order_paise ?? 9900,
        delivery_fee_paise: s?.delivery_fee_paise ?? 4900,
        free_delivery_min_paise: s?.free_delivery_min_paise ?? 49900,
      }}
    />
  );
}
