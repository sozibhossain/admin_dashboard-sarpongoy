import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXTPUBLICBASEURL: process.env.NEXTPUBLICBASEURL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_BASEURL: process.env.NEXT_PUBLIC_BASEURL,
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
