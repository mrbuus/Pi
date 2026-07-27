"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

const MIN_LENGTH = 6;

/* Нууц үг солих — анхны нууц үг = утасны дугаар тул энэ хуудас чухал (SPEC §6.2) */
export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ current: false, next: false, confirm: false });
  const [submitError, setSubmitError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentError = touched.current && !current ? "Одоогийн нууц үгээ оруулна уу" : "";
  const nextError =
    touched.next && next.length > 0 && next.length < MIN_LENGTH
      ? `Дор хаяж ${MIN_LENGTH} тэмдэгт байх ёстой`
      : touched.next && !next
        ? "Шинэ нууц үгээ оруулна уу"
        : "";
  const confirmError =
    touched.confirm && confirm && confirm !== next
      ? "Шинэ нууц үгтэйгээ таарахгүй байна"
      : touched.confirm && !confirm
        ? "Шинэ нууц үгээ дахин бичнэ үү"
        : "";

  function markTouched(field: keyof typeof touched) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setOk(false);
    setTouched({ current: true, next: true, confirm: true });
    if (!current || next.length < MIN_LENGTH || next !== confirm) {
      return;
    }
    setLoading(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { currentPassword: current, newPassword: next },
      });
      setOk(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTouched({ current: false, next: false, confirm: false });
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-extrabold text-ink">Нууц үг солих</h1>
      <p className="mt-1 text-sm text-ink-dim">
        Анхны нууц үг тань утасны дугаар байсан бол заавал солиорой.
      </p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-sm text-ink-dim">
            Одоогийн нууц үг
          </label>
          <input
            id="current-password"
            type="password"
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value);
              if (submitError) setSubmitError("");
            }}
            onBlur={() => markTouched("current")}
            autoComplete="current-password"
            aria-invalid={!!currentError}
            aria-describedby={currentError ? "current-password-error" : undefined}
            className={`w-full rounded-xl border bg-bg px-4 py-3 text-ink outline-none transition focus:border-brand ${
              currentError ? "border-error" : "border-line"
            }`}
          />
          {currentError && (
            <p id="current-password-error" role="alert" className="mt-1.5 text-sm text-error">
              {currentError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm text-ink-dim">
            Шинэ нууц үг
          </label>
          <p id="new-password-hint" className="mb-1.5 text-xs text-ink-dim">
            Дор хаяж {MIN_LENGTH} тэмдэгт байх ёстой
          </p>
          <input
            id="new-password"
            type="password"
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              if (submitError) setSubmitError("");
            }}
            onBlur={() => markTouched("next")}
            autoComplete="new-password"
            aria-invalid={!!nextError}
            aria-describedby={nextError ? "new-password-hint new-password-error" : "new-password-hint"}
            className={`w-full rounded-xl border bg-bg px-4 py-3 text-ink outline-none transition focus:border-brand ${
              nextError ? "border-error" : "border-line"
            }`}
          />
          {nextError && (
            <p id="new-password-error" role="alert" className="mt-1.5 text-sm text-error">
              {nextError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm text-ink-dim">
            Шинэ нууц үг давтах
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (submitError) setSubmitError("");
            }}
            onBlur={() => markTouched("confirm")}
            autoComplete="new-password"
            aria-invalid={!!confirmError}
            aria-describedby={confirmError ? "confirm-password-error" : undefined}
            className={`w-full rounded-xl border bg-bg px-4 py-3 text-ink outline-none transition focus:border-brand ${
              confirmError ? "border-error" : confirm && confirm === next ? "border-success" : "border-line"
            }`}
          />
          {confirmError ? (
            <p id="confirm-password-error" role="alert" className="mt-1.5 text-sm text-error">
              {confirmError}
            </p>
          ) : (
            confirm &&
            confirm === next && (
              <p className="mt-1.5 text-sm text-success">✓ Таарч байна</p>
            )
          )}
        </div>

        {submitError && (
          <p role="alert" className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {submitError}
          </p>
        )}
        {ok && (
          <p role="status" className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            ✓ Нууц үг амжилттай солигдлоо
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full rounded-xl bg-brand-bright py-3 font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Хадгалж байна…" : "Солих"}
        </button>
      </form>
    </div>
  );
}
