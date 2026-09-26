"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import GoogleMark from "./GoogleMark";

/* «Google-ээр нэвтрэх». Сервер дээр GOOGLE_* тохируулаагүй бол огт харагдахгүй
   (GET /auth/google/config). Товч дарахад сервер state үүсгэж Google-ийн
   URL-ийг буцаана — JWT, нууц түлхүүр вэбд хэзээ ч ирэхгүй. */
// Google-ээс /login?google=<үр дүн> гэж буцсан үеийн тайлбар.
const RESULT_TEXT: Record<string, string> = {
  not_linked:
    "Энэ Google бүртгэл Pi.mn-ийн хэрэглэгчтэй холбогдоогүй байна. Эхлээд утас, нууц үгээрээ нэвтэрч «Миний мэдээлэл» хэсгээс Google-ээ холбоно уу.",
  unverified: "Google бүртгэлийн имэйл баталгаажаагүй байна.",
  expired: "Хугацаа дууссан. Дахин оролдоно уу.",
  error: "Google-тэй холбогдоход алдаа гарлаа. Дахин оролдоно уу.",
  cancelled: "Google-ээр нэвтрэхийг цуцаллаа.",
};

export default function GoogleSignInButton({ label = "Google-ээр нэвтрэх" }: { label?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get("google");
    if (g && RESULT_TEXT[g]) {
      const text = RESULT_TEXT[g];
      // URL-ээс уншсан утгыг дараагийн микро-даалгаварт бичнэ (effect дотор synchronous setState биш).
      queueMicrotask(() => setError(text));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    api<{ enabled: boolean }>("/auth/google/config", { auth: false })
      .then((r) => setEnabled(r.enabled))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) {
    return error ? <p className="mt-4 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">{error}</p> : null;
  }

  async function start() {
    setBusy(true);
    setError("");
    try {
      const { url } = await api<{ url: string }>("/auth/google/url", { auth: false });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google руу шилжиж чадсангүй");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs text-ink-dim">
        <span className="h-px flex-1 bg-line" />
        эсвэл
        <span className="h-px flex-1 bg-line" />
      </div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        aria-busy={busy}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface font-semibold text-ink transition hover:border-ink/30 hover:bg-bg disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? "Google руу шилжиж байна…" : label}
      </button>
      {error && <p role="status" className="mt-3 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
    </div>
  );
}
