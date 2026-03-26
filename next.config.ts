import type { NextConfig } from "next";

const rawBackendBase =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_BASEURL ||
  process.env.NEXTPUBLICBASEURL ||
  "";

const trimmedBackendBase = rawBackendBase.replace(/\/+$/, "");
const backendOrigin = trimmedBackendBase.endsWith("/api/v1")
  ? trimmedBackendBase.replace(/\/api\/v1$/, "")
  : trimmedBackendBase;

const nextConfig: NextConfig = {
  env: {
    NEXTPUBLICBASEURL: process.env.NEXTPUBLICBASEURL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_BASEURL: process.env.NEXT_PUBLIC_BASEURL,
  },
  async rewrites() {
    if (!backendOrigin) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
