"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, TriangleAlert } from "lucide-react";
import InfoHint from "@/components/ui/InfoHint";
import { NavIcon } from "@/components/nav/icons";
import { api, setAuth } from "@/lib/api";

const MIN_LENGTH = 6;

/* Нууц үг солих хэсэг — өмнө нь /app/password тусдаа, гарцаагүй тод цэсийн
   зүйл байсныг эзний хүсэлтээр /app/profile дотор нэг хэсэг болгов (SPEC
   §6.2). /app/password хуудас хуучин холбоосууд 404 болохгүйн тулд ажиллаж
   байгаа хэвээр үлдэж, яг энэ л компонентыг дуудна — логик хоёуланд ижил. */
export default function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      // Сервер нууц үг солигдсоны дараа ӨМНӨХ бүх токеныг хүчингүй болгодог
      // (бусад төхөөрөмж дээрх сесс тасарна). Тиймээс шинэ токеныг заавал
      // хадгална — эс бөгөөс энэ таб өөрөө шууд гарчихна.
      const res = await api<{ accessToken?: string; role?: string }>(
        "/auth/change-password",
        {
          method: "POST",
          body: { currentPassword: current, newPassword: next },
        },
      );
      if (res.accessToken && res.role) setAuth(res.accessToken, res.role);
      setOk(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTouched({ current: false, next: false, confirm: false });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        <NavIcon name="key" className="h-5 w-5 text-brand" />
        Нууц үг солих
      </h2>
      <p className="mt-1 text-sm text-ink-dim">
        Анхны нууц үг тань утасны дугаар байсан бол заавал солиорой.
      </p>
      <form onSubmit={submit} noValidate className="mt-5 max-w-sm space-y-4">
        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-ink">
            Одоогийн нууц үг
          </label>
          <div className="relative">
            <input
              id="current-password"
              type={showPassword ? "text" : "password"}
              value={current}
              onChange={(e) => {
                setCurrent(e.target.value);
                if (submitError) setSubmitError("");
              }}
              onBlur={() => markTouched("current")}
              autoComplete="current-password"
              aria-invalid={!!currentError}
              aria-describedby={currentError ? "current-password-error" : undefined}
              className={`w-full rounded-xl border bg-bg px-4 py-3 pr-12 text-ink outline-none transition focus:border-brand ${
                currentError ? "border-error" : "border-line"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Нууц үгийг нуух" : "Нууц үгийг харах"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-dim transition hover:text-ink"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="h-5 w-5" />
              ) : (
                <Eye aria-hidden className="h-5 w-5" />
              )}
            </button>
          </div>
          {currentError && (
            <p id="current-password-error" role="alert" className="mt-1.5 text-sm text-error">
              {currentError}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="new-password" className="block text-sm font-medium text-ink">
              Шинэ нууц үг
            </label>
            <InfoHint label="Хичнээ урт байх вэ">
              Дор хаяж {MIN_LENGTH} тэмдэгт байх ёстой.
            </InfoHint>
          </div>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={next}
              onChange={(e) => {
                setNext(e.target.value);
                if (submitError) setSubmitError("");
              }}
              onBlur={() => markTouched("next")}
              autoComplete="new-password"
              aria-invalid={!!nextError}
              aria-describedby={nextError ? "new-password-error" : undefined}
              className={`w-full rounded-xl border bg-bg px-4 py-3 pr-12 text-ink outline-none transition focus:border-brand ${
                nextError ? "border-error" : "border-line"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Нууц үгийг нуух" : "Нууц үгийг харах"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-dim transition hover:text-ink"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="h-5 w-5" />
              ) : (
                <Eye aria-hidden className="h-5 w-5" />
              )}
            </button>
          </div>
          {/* Шинэ нууц үгийн урт хүрсэн эсэхийг шалгаж харуулна */}
          <p
            className={`mt-1.5 flex items-center gap-1.5 text-xs ${
              next.length === 0
                ? "text-ink-dim"
                : next.length >= MIN_LENGTH
                  ? "text-success"
                  : "text-ink-dim"
            }`}
          >
            {next.length >= MIN_LENGTH && <Check aria-hidden className="h-3.5 w-3.5 shrink-0" />}
            Дор хаяж {MIN_LENGTH} тэмдэгт
          </p>
          {nextError && (
            <p id="new-password-error" role="alert" className="mt-1.5 text-sm text-error">
              {nextError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-ink">
            Шинэ нууц үг давтах
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (submitError) setSubmitError("");
              }}
              onBlur={() => markTouched("confirm")}
              autoComplete="new-password"
              aria-invalid={!!confirmError}
              aria-describedby={confirmError ? "confirm-password-error" : undefined}
              className={`w-full rounded-xl border bg-bg px-4 py-3 pr-12 text-ink outline-none transition focus:border-brand ${
                confirmError ? "border-error" : confirm && confirm === next ? "border-success" : "border-line"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Нууц үгийг нуух" : "Нууц үгийг харах"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-dim transition hover:text-ink"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="h-5 w-5" />
              ) : (
                <Eye aria-hidden className="h-5 w-5" />
              )}
            </button>
          </div>
          {confirmError ? (
            <p id="confirm-password-error" role="alert" className="mt-1.5 text-sm text-error">
              {confirmError}
            </p>
          ) : (
            confirm &&
            confirm === next && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-success">
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Таарч байна
              </p>
            )
          )}
        </div>

        {submitError && (
          <div aria-live="polite" aria-atomic="true">
            <p className="flex items-start gap-2 rounded-xl border border-error/40 bg-error/10 px-3 py-2.5 text-sm text-ink">
              <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <span>{submitError}</span>
            </p>
          </div>
        )}
        {ok && (
          <div aria-live="polite" aria-atomic="true">
            <p className="flex items-start gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2.5 text-sm text-ink">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                <span className="font-semibold">Нууц үг амжилттай солигдлоо.</span> Аюулгүй байдлын үүднээс бусад төхөөрөмж дээрх нэвтрэлт тасарсан.
              </span>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full rounded-xl bg-brand-bright py-3 font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {loading ? "Хадгалж байна…" : "Солих"}
        </button>
      </form>
    </section>
  );
}
