import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "@fontsource/caveat/600.css";
import "./globals.css";
import { Suspense } from "react";
import { NavProgress } from "@/components/layout/NavProgress";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Gupta Enterprises: stationery in minutes, Kohima", template: "%s | Gupta Enterprises" },
  description:
    "Notebooks, pens, office and exam supplies from Gupta Enterprises, Khedi Market, Kohima. Delivered in 45-60 minutes, scheduled, or ready for store pickup.",
  applicationName: "Gupta Enterprises",
  appleWebApp: { capable: true, title: "Gupta Enterprises", statusBarStyle: "default" },
  icons: { apple: "/brand/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1220" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh antialiased">
        <Suspense><NavProgress /></Suspense>
        {children}
      </body>
    </html>
  );
}
