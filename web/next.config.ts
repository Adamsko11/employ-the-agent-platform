import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { typedRoutes: false },
  serverExternalPackages: ["@supabase/ssr"],
};

export default nextConfig;
