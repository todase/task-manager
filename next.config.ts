import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^\/api\//,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^\/(?!_next\/)/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "pages",
        },
      },
    ],
  },
})(nextConfig);
