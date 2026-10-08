import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  distDir: process.env.ARDUSIM_BUILD_DIR || ".next",
};

export default withBundleAnalyzer(nextConfig);
