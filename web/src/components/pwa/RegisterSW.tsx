"use client";
import { useEffect } from "react";
export default function RegisterSW() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator) ||
      !window.isSecureContext
    )
      return;
    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          /* Browsing works when installation is unavailable. */
        });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
