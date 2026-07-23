import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker image chhoti rakhne ke liye — Dockerfile .next/standalone copy karta hai
  output: "standalone",
};

export default nextConfig;
