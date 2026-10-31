import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/collab",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
