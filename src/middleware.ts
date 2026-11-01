import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Signed-in areas send visitors to our own sign-in page first. Role checks (admin, agent,
// blocked) happen in the page layouts and in the database itself.
const isProtected = createRouteMatcher(["/bill(.*)", "/account(.*)", "/cart/checkout", "/orders(.*)", "/wishlist", "/admin(.*)", "/agent(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtected(req)) return;
  const { userId } = await auth();
  if (!userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
});

// Clerk needs to see every page (it keeps the session fresh), but not static files.
export const config = {
  matcher: ["/((?!_next|media/|brand/|catalog/|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|woff2?|css|js|txt|xml|webmanifest)$).*)", "/(api|trpc)(.*)"],
};
