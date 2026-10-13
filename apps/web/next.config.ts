import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  transpilePackages: ["@platform/brand", "@platform/ui"]
};

export default nextConfig;
