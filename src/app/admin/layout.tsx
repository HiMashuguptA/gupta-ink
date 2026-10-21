import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/Logo";
import { AdminLive } from "./AdminLive";
import { StaffProviders } from "@/components/providers/StaffProviders";
import type { Profile } from "@/lib/types";
import { LiveRefresh } from "@/components/live/LiveRefresh";

export const metadata = { title: { default: "Admin", template: "%s | Gupta Ink admin" } };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/returns", label: "Returns and refunds" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/home", label: "Home page" },
  { href: "/admin/coupons", label: "Coupons" },
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
      <aside className="border-b border-line bg-card p-4 md:min-h-dvh md:border-b-0 md:border-r">
        <Link href="/admin"><Logo size={30} /></Link>
        <p className="mt-1 text-xs font-semibold text-muted">Store admin</p>
        <nav className="no-scrollbar mt-4 flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-graphite hover:bg-ink-soft">{n.label}</Link>
          ))}
          <Link href="/" className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-ink-soft">Back to shop</Link>
        </nav>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
      <AdminLive userId={user.id} />
      {/* Any admin page re-renders itself when orders, payments, returns, reviews or stock change */}
      <LiveRefresh id="admin" waitMs={900} watch={[{ table: "orders" }, { table: "payments" }, { table: "returns" }, { table: "reviews" }, { table: "products", event: "UPDATE" }]} />
    </div>
    </StaffProviders>
  );
}
