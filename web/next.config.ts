import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
  turbopack: {
    root,
  },
  // Хөгжүүлэлтийн "N" индикаторыг нуух (хэрэглэгчийн хүсэлтээр)
  devIndicators: false,
  // Утаснаас LAN хаягаар dev серверт орох (эс бөгөөс JS хаагдаж нэвтрэх, анимаци ажиллахгүй)
  // + Cloudflare түр холбоос (гаднаас демо үзүүлэх, .runtime/demo-proxy.cjs-ээр зөвхөн /demo/* нээлттэй)
  allowedDevOrigins: ["172.20.10.3", "192.168.*.*", "10.*.*.*", "172.*.*.*", "*.trycloudflare.com"],
};

export default nextConfig;
