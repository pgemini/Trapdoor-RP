import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// In development, rewrite same-origin /api/* to the local FastAPI server.
// In production, the frontend talks directly to the API host configured at
// build time via NEXT_PUBLIC_API_BASE (see lib/api.ts), and the rewrite is
// effectively unused — but we keep it pointed at TRAPDOOR_API for parity.
const BACKEND = process.env.TRAPDOOR_API
  ?? process.env.NEXT_PUBLIC_API_BASE
  ?? "http://127.0.0.1:8000";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }];
  },
};

export default nextConfig;
