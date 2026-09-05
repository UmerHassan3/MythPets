import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product images are uploaded to ImageKit. Without this, `next/image`
    // refuses remote sources and the tiles fail to render.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
