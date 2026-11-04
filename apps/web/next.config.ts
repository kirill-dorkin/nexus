import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  transpilePackages: ["@platform/brand", "@platform/checks", "@platform/ui"],
  env: {
    // Client telemetry names the deployed build (ADR-0067), never the visitor.
    NEXT_PUBLIC_RELEASE:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local"
  }
};

export default nextConfig;
