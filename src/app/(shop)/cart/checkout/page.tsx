import Link from "next/link";

export const metadata = { title: "Checkout" };

// Phase 2 builds the full checkout here: address and map pin, 15 km road check,
// quick/scheduled/pickup choice, slots, coupons, SuperCoins, UPI and COD.
export default function CheckoutPage() {
  return (
    <div className="ruled mx-4 mt-6 rounded-3xl p-8 pl-14">
      <h1 className="text-2xl font-extrabold">Checkout is the next build step</h1>
      <p className="mt-1 max-w-prose text-muted">
        Your cart is saved to your account. Address and map pin, delivery slots, coupons, SuperCoins and UPI or cash payment arrive in Phase 2.
      </p>
      <Link href="/cart" className="mt-5 inline-flex rounded-xl bg-ink px-5 py-3 font-semibold text-white">Back to cart</Link>
    </div>
  );
}
