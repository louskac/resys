import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.2", "localhost", "127.0.0.1", "zskomenskeho.localhost"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Feature-Policy",
            value: "camera *",
          },
          {
            key: "Permissions-Policy",
            value: "camera=*, geolocation=*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
