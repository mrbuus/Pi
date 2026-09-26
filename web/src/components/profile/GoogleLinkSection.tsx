"use client";

import { useEffect, useState } from "react";
import { Check, Unlink } from "lucide-react";
import GoogleMark from "@/components/auth/GoogleMark";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";

interface Status {
  enabled: boolean;
  linked: boolean;
  identity: { email: string; pictureUrl: string | null; createdAt: string } | null;
}

const RESULT_TEXT: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: "Google бүртгэл амжилттай холбогдлоо." },
  taken: { ok: false, text: "Энэ Google бүртгэл өөр хэрэглэгчид холбогдсон байна." },
  unverified: { ok: false, text: "Google бүртгэлийн имэйл баталгаажаагүй байна." },
  expired: { ok: false, text: "Хугацаа дууссан. Дахин оролдоно уу." },
  error: { ok: false, text: "Google-тэй холбогдоход алдаа гарлаа. Дахин оролдоно уу." },
  cancelled: { ok: false, text: "Холболтыг цуцаллаа." },
};

/* Профайл: Google бүртгэл холбох/салгах. Холбосны дараа утас+нууц үггүйгээр
   «Google-ээр нэвтрэх» товчоор орно. Сервер тохируулаагүй бол хэсэг харагдахгүй. */
export default function GoogleLinkSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Google-ээс буцаж ирсэн үр дүн (?google=linked г.м.) — нэг удаа харуулаад URL-ээс арилгана.
    const g = new URLSearchParams(window.location.search).get("google");
    if (g && RESULT_TEXT[g]) {
      const result = RESULT_TEXT[g];
      queueMicrotask(() => setNotice(result));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api<Status>("/auth/google/status")
      .then((s) => alive && setStatus(s))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа"));
    return () => {
      alive = false;
    };
  }, [tick]);

  async function link() {
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>("/auth/google/link", { method: "POST" });
      window.location.assign(url);
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "Алдаа гарлаа" });
      setBusy(false);
    }
  }

  async function unlink() {
    if (!window.confirm("Google бүртгэлийг салгах уу? Дараа нь утас, нууц үгээрээ нэвтэрнэ.")) return;
    setBusy(true);
    try {
      await api("/auth/google/link", { method: "DELETE" });
      setNotice({ ok: true, text: "Google бүртгэлийг салгалаа." });
      setTick((t) => t + 1);
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "Алдаа гарлаа" });
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError("");
          setTick((t) => t + 1);
        }}
      />
    );
  }
  if (!status) return <LoadingState rows={2} label="Google бүртгэл" />;
  if (!status.enabled) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        <GoogleMark />
        Google бүртгэл
      </h2>
      {notice && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${notice.ok ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}
        >
          {notice.text}
        </p>
      )}
      {status.linked && status.identity ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">
            <Check className="h-4 w-4" aria-hidden />
            Холбогдсон
          </span>
          <span className="min-w-0 break-all text-sm text-ink">{status.identity.email}</span>
          <button
            type="button"
            onClick={unlink}
            disabled={busy}
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line px-4 text-sm font-semibold text-ink-dim transition hover:border-error/40 hover:text-error disabled:opacity-60"
          >
            <Unlink className="h-4 w-4" aria-hidden />
            Салгах
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-ink-dim">
            Холбосны дараа утас, нууц үг бичихгүйгээр «Google-ээр нэвтрэх» товчоор орно.
          </p>
          <button
            type="button"
            onClick={link}
            disabled={busy}
            className="mt-4 inline-flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-5 font-semibold text-ink transition hover:border-ink/30 hover:bg-bg disabled:opacity-60"
          >
            <GoogleMark />
            {busy ? "Google руу шилжиж байна…" : "Google бүртгэл холбох"}
          </button>
        </div>
      )}
    </section>
  );
}
