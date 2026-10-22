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
    ] },
    // Нүүрний амжилтын зураг (эзэн 2026-10-22: «орох болгонд татаж серверийн төлбөр өсгөхгүй»):
    // хөтөч 30 хоног хадгална, CDN (Vercel/Cloudflare) дахин татахгүй. Ижил нэрээр зураг солих бол
    // 30 хоног хуучин нь харагдаж магадгүй — шинэ нэр өгнө.
    { source: "/amjilt/:path*", headers: [
      { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=604800" },
    ] },
    // Жагсаалт (он бүрийн JSON) шинэ амжилт нэмэгдэхэд шинэчлэгдэх ёстой — 1 цаг, ар талд шинэчилнэ
    { source: "/amjilt/:file.json", headers: [
      { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
    ] },
    { source: "/home/:path*", headers: [
      { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=604800" },
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
