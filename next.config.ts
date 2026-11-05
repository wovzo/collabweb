import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/collab",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.2.69", "localhost:3000"],
};

export default nextConfig;
