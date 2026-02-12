import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Prevent bundling pdfkit so its font data files (.afm) resolve correctly at runtime
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
