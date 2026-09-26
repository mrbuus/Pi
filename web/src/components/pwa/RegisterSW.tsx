"use client";
import { useEffect } from "react";
import { toast } from "sonner";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) || !window.isSecureContext) return;
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
