import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis is loaded via dynamic import() in src/lib/drive.ts — exclude from
  // the Edge runtime bundle so webpack doesn't try to resolve Node.js built-ins
  serverExternalPackages: ["googleapis"],
};

export default nextConfig;
