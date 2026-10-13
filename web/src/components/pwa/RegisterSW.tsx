"use client";
import { useEffect } from "react";
import { toast } from "sonner";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Хөгжүүлэлтийн горимд (next dev) өмнө нь production build-ээс суусан
    // service worker хуучин JS-ийг кэшээс өгсөөр байж, засвар хөтөчид огт
    // харагдахгүй байв (2026-10-08). Тиймээс dev-д SW-г устгаж, кэшийг цэвэрлээд
    // нэг удаа дахин ачаална.
    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          const keys = "caches" in window ? await caches.keys() : [];
          const stale = keys.filter((k) => k.startsWith("pi-"));
          await Promise.all([...regs.map((r) => r.unregister()), ...stale.map((k) => caches.delete(k))]);
          if ((regs.length || stale.length) && navigator.serviceWorker.controller) window.location.reload();
        } catch { /* хөгжүүлэлтийн туслах — алдаа гарвал алгасна */ }
      })();
      return;
    }
    if (!window.isSecureContext) return;
    let cancelled = false;
    let refreshing = false;
    let announced = false;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const activate = () => { if (refreshing) window.location.reload(); };
    const offer = () => {
      if (cancelled || announced || !registration?.waiting || !navigator.serviceWorker.controller) return;
      announced = true;
      toast.info("Шинэ хувилбар бэлэн. Хийж буй ажлаа хадгалсны дараа шинэчилнэ үү.", {
        id: "pi-pwa-update", duration: Infinity,
        action: { label: "Шинэчлэх", onClick: () => { refreshing = true; registration?.waiting?.postMessage({ type: "PI_ACTIVATE_UPDATE" }); } },
      });
    };
    const stateChanged = () => { if (installing?.state === "installed") offer(); };
    const found = () => { installing?.removeEventListener("statechange", stateChanged); installing = registration?.installing ?? null; installing?.addEventListener("statechange", stateChanged); };
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register(`/sw.js?api=${encodeURIComponent(apiBase)}`, { scope: "/", updateViaCache: "none" });
        if (cancelled) return;
        registration.addEventListener("updatefound", found);
        found(); offer();
      } catch { /* Browsing works when storage or installation is unavailable. */ }
    };
    navigator.serviceWorker.addEventListener("controllerchange", activate);
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", activate);
      registration?.removeEventListener("updatefound", found);
      installing?.removeEventListener("statechange", stateChanged);
      toast.dismiss("pi-pwa-update");
    };
  }, []);
  return null;
}
