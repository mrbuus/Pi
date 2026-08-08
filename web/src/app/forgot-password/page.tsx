"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleCheck,
  Eye,
  EyeOff,
  TriangleAlert,
} from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { api } from "@/lib/api";

/**
 * Нууц үг сэргээх — 2 алхам.
 *
 * ── Яагаад 3 биш 2 алхам вэ ────────────────────────────────────────────────
 * "Кодоо оруул" болон "шинэ нууц үгээ бич" гэсэн хоёрыг салгавал сервер рүү
 * нэмэлт дуудлага (код зөв эсэхийг урьдчилж шалгах) хэрэгтэй болно. Тэр
 * endpoint нь өөрөө брутфорсын нэмэлт гадаргуу үүсгэнэ. Тиймээс кодоо болон
 * шинэ нууц үгээ нэг дор авч, НЭГ л удаа шалгуулна.
 *
 * ── Дизайны шийдэл (2026-08-07) ────────────────────────────────────────────
 *
 * 1. АЛХМЫН ЗААЛТ. Хэрэглэгч хаана явааг, хэдэн алхам үлдсэнийг үргэлж мэднэ.
 *    Тодорхойгүй байдал бол сэргээх урсгал дээр хаягдах хамгийн том шалтгаан.
 *
 * 2. КОД ИРЭХГҮЙ БОЛ ЯАХ ВЭ. Энэ бол OTP урсгалын хамгийн том нүх. Хэрэглэгч
 *    SMS хүлээгээд ирэхгүй бол ЮУ Ч ХИЙХГҮЙ орхиод явдаг. Тиймээс бодит
 *    шалтгаан бүр (саатал, буруу дугаар, бүртгэлгүй дугаар) болон АЖИЛЛАДАГ
 *    өөр зам (багш/админаас код авах) тодорхой бичигдсэн.
 *
 * 3. SMS ТОХИРУУЛААГҮЙ ҮЕИЙН ЗАМ. STATUS.md §6.2 — SMS нийлүүлэгч сонгогдтол
 *    сервер 503 буцаана. Тэр үед хэрэглэгч бүтэн хаалттай хана мөргөх ёсгүй:
 *    ажилтан сурагчийн хуудаснаас код илгээж чадна гэдгийг ЭНД хэлнэ.
 *    Илгээх бүтэлгүйтмэгц тусламжийн хэсэг ӨӨРӨӨ нээгдэнэ.
 *
 * 4. КОДЫН ХУГАЦАА ХАРАГДАНА. Сервер талд 10 минут. Хэрэглэгч SMS хайж
 *    байгаад буцаж ирэхэд код амьд эсэхийг таамаглах ёсгүй.
 *
 * 5. НУУЦ ҮГИЙН ТӨЛӨВ ШУУД. Урт хүрсэн эсэх, хоёр нь таарч байгаа эсэхийг
 *    илгээхээс ӨМНӨ харуулна — илгээгээд буцаж алдаа авах нь цаг алдуулна.
 */

const MIN_PASSWORD = 6;
const CODE_LENGTH = 6;
/** Дахин код хүсэх хүртэлх хүлээлт (сервер талд ч 15 минутад 3 удаа гэсэн хязгаартай) */
const RESEND_COOLDOWN_SEC = 60;
/** Кодын амьдрах хугацаа — сервер талтай (password-reset.service.ts) ижил байх ЁСТОЙ */
const CODE_TTL_SEC = 10 * 60;

const inputCls =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink outline-none transition placeholder:text-ink-dim/70 focus:border-brand";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/** 545 → "9:05" */
function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"identify" | "verify" | "done">("identify");

  const [identifier, setIdentifier] = useState("");
  const [maskedTo, setMaskedTo] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [codeLeft, setCodeLeft] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  const codeRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Дахин илгээх таймер
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Кодын хүчинтэй хугацааны тоолуур
  useEffect(() => {
    if (codeLeft <= 0) return;
    const t = setTimeout(() => setCodeLeft((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [codeLeft]);

  // Алхам солигдоход фокусыг зөв газар тавина: код оруулах талбар дээр
  // (хэрэглэгч SMS-ээ хараад буцаж ирээд шууд бичиж эхэлнэ), эцсийн алхамд
  // гарчиг дээр (дэлгэц уншигч "боллоо" гэдгийг зарлана).
  useEffect(() => {
    if (step === "verify") codeRef.current?.focus();
    if (step === "done") headingRef.current?.focus();
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
        setCodeLeft(CODE_TTL_SEC);
        setHelpOpen(false);
        if (isResend) setCode("");
      } catch (e) {
        setError(errMsg(e));
        // Илгээх бүтэлгүйтвэл тусламжийг ӨӨРӨӨ нээнэ. Хэрэглэгч алдаа хараад
        // юу хийхээ мэдэхгүй үлдэх ёсгүй — ажилладаг өөр зам тэр дор нь харагдана.
        setHelpOpen(true);
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
      codeRef.current?.focus();
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
      setHelpOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const passwordLongEnough = password.length >= MIN_PASSWORD;
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const codeExpired = step === "verify" && codeLeft === 0;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <Link
          href="/"
          aria-label="Pi.mn үндсэн нүүр"
          className="mb-6 flex w-fit rounded-xl outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-brand-bright/70"
        >
          <LogoMark variant="full" size={58} priority />
        </Link>

        {/* ---------- Алхмын заалт ---------- */}
        {step !== "done" && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-dim">
              Алхам {step === "identify" ? 1 : 2} / 2
            </p>
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-1 flex-1 rounded-full bg-brand-bright" />
              <span
                className={`h-1 flex-1 rounded-full transition ${
                  step === "verify" ? "bg-brand-bright" : "bg-line"
                }`}
              />
            </div>
          </div>
        )}

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
                aria-describedby={error ? "fp-error" : undefined}
                className={inputCls}
              />
            </div>

            <ErrorLine id="fp-error" message={error} />

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
                  // Зөвхөн цифр — SMS-ээс хуулж буулгахад орсон зай, зураас
                  // зэргийг чимээгүй цэвэрлэнэ.
                  setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
                  if (error) setError("");
                }}
                placeholder="123456"
                inputMode="numeric"
                // Утас дээр SMS-ээс кодыг АВТОМАТААР бөглөх боломж
                // (iOS болон Android хоёулаа энэ утгыг ойлгодог).
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                className={`${inputCls} text-center font-mono text-2xl tracking-[0.5em]`}
              />

              {/* Кодын хугацаа — SMS хайж яваад буцаж ирэхэд амьд эсэхийг
                  таамаглах ёсгүй. */}
              <p
                className={`mt-2 text-xs ${codeExpired ? "text-error" : "text-ink-dim"}`}
                aria-live="polite"
              >
                {codeExpired
                  ? "Кодын хугацаа дууслаа. Дахин илгээнэ үү."
                  : `Код ${mmss(codeLeft)}-ын дараа хүчингүй болно.`}
              </p>

              <div className="mt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => void requestCode(true)}
                  disabled={cooldown > 0 || loading}
                  className="font-medium text-brand transition hover:underline disabled:text-ink-dim disabled:no-underline"
                >
                  {cooldown > 0 ? `Дахин илгээх (${cooldown}с)` : "Код дахин илгээх"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("identify");
                    setError("");
                    setCode("");
                    setCodeLeft(0);
                  }}
                  className="text-ink-dim transition hover:text-ink"
                >
                  Дугаар солих
                </button>
              </div>
            </div>

            {/* ---------- Шинэ нууц үг ---------- */}
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-ink">
                Шинэ нууц үг
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="new-password"
                  aria-describedby="pw-rule"
                  className={`${inputCls} pr-12`}
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
              {/* Шаардлагыг илгээхээс ӨМНӨ шалгаж харуулна */}
              <p
                id="pw-rule"
                className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                  password.length === 0
                    ? "text-ink-dim"
                    : passwordLongEnough
                      ? "text-success"
                      : "text-ink-dim"
                }`}
              >
                {passwordLongEnough && <Check aria-hidden className="h-3.5 w-3.5 shrink-0" />}
                Дор хаяж {MIN_PASSWORD} тэмдэгт
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Шинэ нууц үг давтах
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="new-password"
                aria-describedby="pw-match"
                className={inputCls}
              />
              <p
                id="pw-match"
                aria-live="polite"
                className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                  confirm.length === 0
                    ? "text-ink-dim"
                    : passwordsMatch
                      ? "text-success"
                      : "text-error"
                }`}
              >
                {confirm.length > 0 &&
                  (passwordsMatch ? (
                    <>
                      <Check aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      Таарч байна
                    </>
                  ) : (
                    "Хоёр нууц үг таарахгүй байна"
                  ))}
              </p>
            </div>

            <ErrorLine id="fp-error" message={error} />

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
                <h1 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-ink outline-none">
                  Нууц үг солигдлоо
                </h1>
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

        {/* ---------- Код ирэхгүй бол ----------
            OTP урсгалын хамгийн том нүх. Хэрэглэгч SMS хүлээгээд ирэхгүй бол
            юу ч хийхгүй орхиод явдаг. Тиймээс бодит шалтгаан бүр болон
            АЖИЛЛАДАГ өөр зам энд бичигдсэн. Илгээх бүтэлгүйтвэл өөрөө нээгдэнэ. */}
        {step !== "done" && (
          <div className="mt-5 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              aria-expanded={helpOpen}
              aria-controls="fp-help"
              className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-ink transition hover:text-brand"
            >
              Код ирэхгүй байна уу?
              <ChevronDown
                aria-hidden
                className={`h-4 w-4 shrink-0 text-ink-dim transition-transform ${
                  helpOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {helpOpen && (
              <ul id="fp-help" className="mt-3 space-y-2.5 text-sm text-ink-dim">
                <li>
                  <span className="font-medium text-ink">Түр хүлээнэ үү.</span>{" "}
                  Мессеж 1–2 минут саатаж болно. Хүлээж байгаад «Код дахин илгээх»
                  дарна уу.
                </li>
                <li>
                  <span className="font-medium text-ink">Дугаараа шалгана уу.</span>{" "}
                  Бүртгэлд байгаа дугаараа яг тэр хэвээр, зайгүй, 8 оронтойгоор
                  бичнэ.
                </li>
                <li>
                  <span className="font-medium text-ink">
                    Бүртгэлгүй дугаар байж болно.
                  </span>{" "}
                  Тухайн дугаар бүртгэлд байхгүй бол код илгээгдэхгүй. Аль
                  дугаараар бүртгүүлснээ санахгүй бол доорх замыг ашиглана уу.
                </li>
                <li className="rounded-xl border border-line bg-panel p-3 text-ink">
                  <span className="font-semibold">Багш эсвэл админд хандана уу.</span>{" "}
                  Сургалтын төвийн ажилтан таны бүртгэл дээрээс сэргээх код
                  илгээж чадна. Тэд кодыг өөрсдөө ХАРАХГҮЙ — зөвхөн танд очно.
                </li>
              </ul>
            )}
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

/**
 * Алдааны мөр — aria-live тул дэлгэц уншигч өөрөө зарлана. Хоосон үед ч
 * элемент нь DOM-д үлдэнэ, эс бөгөөс зарим уншигч шинээр гарч ирсэн
 * агуулгыг олж чаддаггүй.
 */
function ErrorLine({ id, message }: { id: string; message: string }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {message && (
        <p
          id={id}
          className="flex items-start gap-2 rounded-xl border border-error/40 bg-error/10 px-3 py-2.5 text-sm text-ink"
        >
          <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-error" />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
