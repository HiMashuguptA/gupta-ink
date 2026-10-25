import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { AdminNav } from "./AdminNav";
import { AdminLive } from "./AdminLive";
import { StaffProviders } from "@/components/providers/StaffProviders";
import type { Profile } from "@/lib/types";
import { LiveRefresh } from "@/components/live/LiveRefresh";

export const metadata = { title: { default: "Admin", template: "%s | Gupta Enterprises admin" } };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/returns", label: "Returns and refunds" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/home", label: "Home page" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/users", label: "Users and roles" },
  { href: "/admin/settings", label: "Store settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionProfile();
  if (!profile || !user) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/");
  return (
    <StaffProviders user={user} profile={profile as Profile}>
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <AdminNav nav={NAV} />
      <main className="min-w-0 p-4 md:p-8">{children}</main>
      <AdminLive userId={user.id} />
      {/* Any admin page re-renders itself when orders, payments, returns, reviews or stock change */}
      <LiveRefresh id="admin" waitMs={900} watch={[{ table: "orders" }, { table: "payments" }, { table: "returns" }, { table: "reviews" }, { table: "products", event: "UPDATE" }]} />
    </div>
    </StaffProviders>
  );
}
