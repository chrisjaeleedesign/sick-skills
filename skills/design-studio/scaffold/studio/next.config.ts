import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  async redirects() {
    return [
      { source: "/thoughts", destination: "/bank", permanent: false },
      { source: "/thoughts/:path*", destination: "/bank", permanent: false },
    ];
  },
};

export default nextConfig;
