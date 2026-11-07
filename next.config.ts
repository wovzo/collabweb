import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  ...(isDev ? {} : { output: "export" }),
  basePath: "/collab",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.2.69", "localhost:3000"],
  ...(isDev
    ? {
        async rewrites() {
          return [
            {
              source: "/api/ig-proxy/:handle",
              destination: "https://www.instagram.com/:handle/",
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
