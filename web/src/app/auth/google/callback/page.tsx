"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { api, homeForRole, setAuth } from "@/lib/api";

const ERROR_MESSAGE: Record<string, string> = {
  cancelled: "Google нэвтрэхийг цуцаллаа.",
  not_linked:
    "Энэ Google account Pi.mn бүртгэлтэй холбогдоогүй байна. Эхлээд утас, нууц үгээрээ нэвтэрч Profile хэсгээс холбоно уу.",
  already_linked: "Энэ Google account өөр Pi.mn бүртгэлтэй холбогдсон байна.",
  invalid_response: "Google-ээс буцах мэдээлэл дутуу байна. Дахин оролдоно уу.",
  failed: "Google нэвтрэхийг баталгаажуулж чадсангүй. Дахин оролдоно уу.",
};

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const providerError = searchParams.get("error");
    const code = searchParams.get("code");
    if (providerError) {
      setError(ERROR_MESSAGE[providerError] ?? ERROR_MESSAGE.failed);
      return;
    }
    if (!code) {
      setError(ERROR_MESSAGE.invalid_response);
      return;
    }
    // React dev Strict Mode effect-ийг дахин ажиллуулж болох ч солилцооны код
    // нэг удаагийнх. Тиймээс нэг л POST илгээнэ.
    if (started.current) return;
    started.current = true;

    api<{ accessToken: string; role: string }>("/auth/google/exchange", {
      method: "POST",
      body: { code },
      auth: false,
    })
      .then((result) => {
        setAuth(result.accessToken, result.role);
        router.replace(homeForRole(result.role));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : ERROR_MESSAGE.failed);
      });
  }, [router, searchParams]);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div
        aria-hidden
        className="grid-bg pointer-events-none absolute inset-0"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <Link
          href="/"
          aria-label="Pi.mn үндсэн нүүр"
          className="mx-auto flex w-fit"
        >
          <LogoMark variant="full" size={58} priority />
        </Link>
        {error ? (
          <>
            <CircleAlert
              className="mx-auto mt-7 h-8 w-8 text-error"
              aria-hidden="true"
            />
            <h1 className="mt-3 text-lg font-bold text-ink">
              Google нэвтрэх боломжгүй
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-dim">{error}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-brand-bright px-5 py-3 text-sm font-bold text-on-brand"
            >
              Нэвтрэх хуудас руу буцах
            </Link>
          </>
        ) : (
          <>
            <LoaderCircle
              className="mx-auto mt-7 h-8 w-8 animate-spin text-brand"
              aria-hidden="true"
            />
            <h1 className="mt-3 text-lg font-bold text-ink">Нэвтрүүлж байна</h1>
            <p className="mt-2 text-sm text-ink-dim">
              Google account-ыг баталгаажуулж байна.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

// Next.js нь page load дээр search params-ийг prerender хийх боломжгүй тул
// useSearchParams хэрэглэдэг client хэсгийг Suspense boundary-д заавал байрлуулна.
// Үгүй бол зөвхөн production build үед гардаг алдаа болно.
export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
          <div
            aria-hidden
            className="grid-bg pointer-events-none absolute inset-0"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
            <LoaderCircle
              className="mx-auto h-8 w-8 animate-spin text-brand"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-ink-dim">
              Google нэвтрэхийг ачаалж байна.
            </p>
          </div>
        </main>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
