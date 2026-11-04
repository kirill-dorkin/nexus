import type { NextConfig } from "next";

import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  transpilePackages: ["@platform/brand", "@platform/ui"],
  env: {
    // Client telemetry names the deployed build (ADR-0067), never the visitor.
    NEXT_PUBLIC_RELEASE:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local"
  },
  headers() {
    return Promise.resolve([
      // Every page except the Paddle checkout, which gets the same policy
      // plus Paddle's own origins (two matching rules would both apply).
      {
        source: "/:path((?!checkout/paddle/).*)",
        headers: securityHeaders({
          apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN
        })
      },
      {
        source: "/checkout/paddle/:path*",
        headers: securityHeaders({
          payments: true,
          apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN
        })
      }
    ]);
  }
};

export default nextConfig;
