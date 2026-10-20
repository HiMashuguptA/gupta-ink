import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

const PROTECTED = ["/account", "/cart/checkout", "/orders", "/wishlist", "/admin", "/agent"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refreshes the session cookie when it's about to expire. Reading it needs no network call.
  // This only decides whether to send someone to the sign-in page; every page and the
  // database verify the sign-in properly before showing or changing anything.
  const { data } = await supabase.auth.getSession();
  const user = data.session ? true : null; // presence only; don't trust the unverified contents here
  const path = req.nextUrl.pathname;

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Role checks (admin, agent, blocked) happen in the page layouts, which already load
  // the profile, and in the database itself. Doing them here would add a database
  // round trip to every single request.

  // Security headers
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|catalog/|brand/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
