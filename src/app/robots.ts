import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/** Shop, categories, products and policies are open to search engines; accounts, carts and tools are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/agent", "/account", "/cart", "/orders", "/wishlist", "/bill", "/api/", "/sso-callback", "/login", "/blocked", "/search"],
    }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
