import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root,
  },
  // Хөгжүүлэлтийн "N" индикаторыг нуух (хэрэглэгчийн хүсэлтээр)
  devIndicators: false,
};

export default nextConfig;
