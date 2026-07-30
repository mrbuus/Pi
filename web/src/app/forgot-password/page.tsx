"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CircleCheck, TriangleAlert } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { api } from "@/lib/api";

/**
 * Нууц үг сэргээх — 2 алхам.
 *
 * Яагаад 3 биш 2 вэ: "кодоо оруул" болон "шинэ нууц үгээ бич" гэсэн хоёрыг
 * салгавал сервер рүү нэмэлт дуудлага (код зөв эсэхийг урьдчилж шалгах)
 * хэрэгтэй болно. Тэр endpoint нь өөрөө брутфорсын нэмэлт гадаргуу үүсгэнэ.
 * Тиймээс кодоо болон шинэ нууц үгээ нэг дор авч, НЭГ л удаа шалгуулна.
 */

const MIN_PASSWORD = 6;
const CODE_LENGTH = 6;
/** Дахин код хүсэх хүртэлх хүлээлт (сервер талд ч 15 минутад 3 удаа гэсэн хязгаартай) */
const RESEND_COOLDOWN_SEC = 60;

const inputCls =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink outline-none transition focus:border-brand";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"identify" | "verify" | "done">("identify");

  const [identifier, setIdentifier] = useState("");
  const [maskedTo, setMaskedTo] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const codeRef = useRef<HTMLInputElement>(null);

  // Дахин илгээх таймер
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Код оруулах алхам руу шилжихэд талбар дээр шууд фокус тавина —
  // хэрэглэгч SMS-ээ хараад буцаж ирээд шууд бичиж эхлэх боломжтой.
  useEffect(() => {
    if (step === "verify") codeRef.current?.focus();
  }, [step]);

  const requestCode = useCallback(
    async (isResend: boolean) => {
      if (!identifier.trim()) {
        setError("Утасны дугаараа оруулна уу");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await api<{ maskedTo: string }>("/auth/forgot-password", {
          method: "POST",
          body: { identifier: identifier.trim() },
          auth: false,
        });
        setMaskedTo(res.maskedTo);
        setStep("verify");
        setCooldown(RESEND_COOLDOWN_SEC);
        if (isResend) setCode("");
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    },
    [identifier],
  );

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (code.length !== CODE_LENGTH) {
      setError(`Код ${CODE_LENGTH} оронтой байна`);
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Шинэ нууц үг дор хаяж ${MIN_PASSWORD} тэмдэгт байна`);
      return;
    }
    if (password !== confirm) {
      setError("Хоёр нууц үг таарахгүй байна");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: { identifier: identifier.trim(), code, newPassword: password },
        auth: false,
      });
      setStep("done");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <Link
          href="/"
          aria-label="Pi.mn үндсэн нүүр"
          className="mb-7 flex w-fit rounded-xl outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-brand-bright/70"
        >
          <LogoMark variant="full" size={58} priority />
        </Link>

        {/* ---------- Алхам 1: хэн бэ ---------- */}
        {step === "identify" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void requestCode(false);
            }}
            noValidate
            className="space-y-4"
          >
            <div>
              <h1 className="text-lg font-bold text-ink">Нууц үг сэргээх</h1>
              <p className="mt-1.5 text-sm text-ink-dim">
                Бүртгэлтэй утасны дугаараа оруулна уу. Сэргээх кодыг тэр дугаар
                руу мессежээр илгээнэ.
              </p>
            </div>

            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-ink">
                Утасны дугаар
              </label>
              <input
                id="identifier"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError("");
                }}
                placeholder="99112233"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                aria-invalid={!!error}
                className={inputCls}
              />
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-error">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full rounded-xl bg-brand-bright py-3 font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Илгээж байна…" : "Код илгээх"}
            </button>
          </form>
        )}

        {/* ---------- Алхам 2: код + шинэ нууц үг ---------- */}
        {step === "verify" && (
          <form onSubmit={submitReset} noValidate className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-ink">Код оруулах</h1>
              <p className="mt-1.5 text-sm text-ink-dim">
                <span className="font-semibold text-ink">{maskedTo}</span> дугаар
                руу {CODE_LENGTH} оронтой код илгээлээ.
              </p>
            </div>

            <div>
              <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-ink">
                Сэргээх код
              </label>
              <input
                ref={codeRef}
                id="code"
                value={code}
                onChange={(e) => {
                  // Зөвхөн цифр — хэрэглэгч SMS-ээс хуулж буулгахад орох зай,
                  // зураас зэргийг чимээгүй цэвэрлэнэ.
                  setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
                  if (error) setError("");
                }}
                placeholder="123456"
                inputMode="numeric"
                // Утас дээр SMS-ээс кодыг АВТОМАТААР бөглөх боломж олгоно
                // (iOS/Android хоёулаа энэ утгыг ойлгодог).
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                className={`${inputCls} text-center font-mono text-2xl tracking-[0.5em]`}
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => void requestCode(true)}
                  disabled={cooldown > 0 || loading}
                  className="text-brand transition hover:underline disabled:text-ink-dim disabled:no-underline"
                >
                  {cooldown > 0 ? `Дахин илгээх (${cooldown}с)` : "Код дахин илгээх"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("identify");
                    setError("");
                    setCode("");
                  }}
                  className="text-ink-dim transition hover:text-ink"
                >
                  Дугаар солих
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-ink">
                Шинэ нууц үг
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="new-password"
                className={inputCls}
              />
              <p className="mt-1.5 text-xs text-ink-dim">
                Дор хаяж {MIN_PASSWORD} тэмдэгт
              </p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-ink">
                Шинэ нууц үг давтах
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="new-password"
                className={inputCls}
              />
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-error">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full rounded-xl bg-brand-bright py-3 font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Хадгалж байна…" : "Нууц үг солих"}
            </button>
          </form>
        )}

        {/* ---------- Алхам 3: боллоо ---------- */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              <div>
                <h1 className="text-lg font-bold text-ink">Нууц үг солигдлоо</h1>
                <p className="mt-1.5 text-sm text-ink-dim">
                  Шинэ нууц үгээрээ нэвтэрнэ үү. Бусад төхөөрөмж дээрх нэвтрэлт
                  аюулгүй байдлын үүднээс тасарсан.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full rounded-xl bg-brand-bright py-3 font-bold text-on-brand transition hover:opacity-90"
            >
              Нэвтрэх
            </button>
          </div>
        )}

        {step !== "done" && (
          <p className="mt-5 text-center text-sm">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-ink-dim transition hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Нэвтрэх хуудас руу буцах
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
