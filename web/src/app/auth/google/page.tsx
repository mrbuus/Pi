"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { api, homeForRole, setAuth } from "@/lib/api";

/* Google-ээс буцсаны дараах завсрын хуудас. Сервер энд 60 секундийн нэг
   удаагийн код дамжуулна (JWT-г URL-д тавихгүй). Кодыг POST-оор солиод
   хаягийн мөрөөс шууд арилгана (түүхэнд үлдэхгүй). */
export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React dev горимд давхар ажиллахаас (код нэг удаагийн)
    started.current = true;
    const code = new URLSearchParams(window.location.search).get("code");
    window.history.replaceState(null, "", "/auth/google");
    if (!code) {
      queueMicrotask(() => setError("Нэвтрэх код алга байна."));
      return;
    }
    api<{ accessToken: string; role: string }>("/auth/google/exchange", {
      method: "POST",
      body: { code },
      auth: false,
    })
      .then((res) => {
        setAuth(res.accessToken, res.role);
        router.replace(homeForRole(res.role));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Нэвтэрч чадсангүй"));
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center">
        {error ? (
          <>
            <TriangleAlert className="mx-auto h-8 w-8 text-error" aria-hidden />
            <p className="mt-3 font-semibold text-ink">{error}</p>
            <Link
              href="/login"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-bright px-5 font-bold text-on-brand"
            >
              Нэвтрэх хуудас руу буцах
            </Link>
          </>
        ) : (
          <p role="status" className="flex items-center justify-center gap-2 text-ink-dim">
            <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
            Нэвтэрч байна…
          </p>
        )}
      </div>
    </main>
  );
}
