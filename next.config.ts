import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep visited pages in the browser's router cache so back/forward and
    // revisits within 30s are instant (data still refreshes after that).
    staleTimes: { dynamic: 30, static: 300 },
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  poweredByHeader: false,
};

export default nextConfig;
