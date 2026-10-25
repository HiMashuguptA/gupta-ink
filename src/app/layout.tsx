import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders-display";
import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";
import { Suspense } from "react";
import { ViewTransitions } from "next-view-transitions";
import { NavProgress } from "@/components/layout/NavProgress";
import { Splash } from "@/components/layout/Splash";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Gupta Enterprises: stationery in minutes, Kohima", template: "%s | Gupta Enterprises" },
  description:
    "Notebooks, pens, office and exam supplies from Gupta Enterprises, Khedi Market, Kohima. Delivered in 45-60 minutes, scheduled, or ready for store pickup.",
  applicationName: "Gupta Enterprises",
  appleWebApp: { capable: true, title: "Gupta Enterprises", statusBarStyle: "default" },
  icons: { apple: "/brand/apple-touch-icon.png" },
  openGraph: { type: "website", siteName: "Gupta Enterprises", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a4d3b" },
    { media: "(prefers-color-scheme: dark)", color: "#0a3329" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="en-IN" suppressHydrationWarning>
        <head>
          {/* Saved light/dark choice before first paint, and the scroll-reveal watcher (runs before React loads, so nothing waits on hydration) */}
          <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("ge-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}
try{if(sessionStorage.getItem("ge-splash"))document.documentElement.classList.add("no-splash");else sessionStorage.setItem("ge-splash","1")}catch(e){}
if("IntersectionObserver" in window&&"MutationObserver" in window){document.documentElement.classList.add("js");
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("is-in");io.unobserve(e.target)}})},{rootMargin:"0px 0px -6% 0px",threshold:0.05});
var see=function(n){if(n.nodeType!==1)return;if(n.matches(".reveal,.reveal-clip"))io.observe(n);n.querySelectorAll&&n.querySelectorAll(".reveal,.reveal-clip").forEach(function(x){io.observe(x)})};
new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(see)})}).observe(document.documentElement,{childList:true,subtree:true});}` }} />
        </head>
        <body className="min-h-dvh antialiased">
          <Splash />
          <Suspense><NavProgress /></Suspense>
          {children}
        </body>
      </html>
    </ViewTransitions>
  );
}
