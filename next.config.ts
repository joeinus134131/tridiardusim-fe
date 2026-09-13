import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ARDUSIM_BUILD_DIR || ".next",
};

export default nextConfig;
