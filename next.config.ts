import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Static export has no server to run Next's image optimizer at request time.
  images: { unoptimized: true },
};

export default nextConfig;
