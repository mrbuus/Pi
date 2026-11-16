"use client";

import { useSyncExternalStore } from "react";

/** Улаанбаатарын өнөөдрийн огноо «YYYY-MM-DD» (сервер UTC-д ажилладаг тул цагийн бүсийг заавал) */
export function ubToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date());
}

function subscribe(onChange: () => void): () => void {
  // Таб шөнөжин нээлттэй үлдсэн, утсан дээр апп-аа сэргээсэн (pageshow/bfcache),
  // цонх руу буцаж ирсэн үед өдөр солигдсон эсэхийг дахин шалгана
  const timer = window.setInterval(onChange, 60_000);
  const onVisible = () => document.visibilityState === "visible" && onChange();
  window.addEventListener("focus", onChange);
  window.addEventListener("pageshow", onChange);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", onChange);
    window.removeEventListener("pageshow", onChange);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/**
 * Өнөөдрийн УБ огноо — шөнө дунд, таб сэргээх, цонх руу буцахад өөрөө шинэчлэгдэнэ.
 * `useState(ubToday)` шиг анх mount хийсэн өдөрт гацахгүй (эзэн 2026-11-16: самбар
 * хуучин өдөр нээгддэг байсан).
 */
export function useUbToday(): string {
  return useSyncExternalStore(subscribe, ubToday, ubToday);
}
