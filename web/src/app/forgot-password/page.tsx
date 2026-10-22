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
  MailCheck,
  TriangleAlert,
} from "lucide-react";
import LogoMark from "@/components/LogoMark";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import InfoHint from "@/components/ui/InfoHint";
import { api } from "@/lib/api";
import { PASSWORD_MIN_LENGTH, isPasswordStrong } from "@/lib/passwordPolicy";

/**
 * Нууц үг сэргээх — 2 алхам.
 *
 * ── Хоёр зам (эзэн 2026-10-22) ─────────────────────────────────────────────
 * 1. ИМЭЙЛ ХОЛБООС. Бүртгэлд имэйл эсвэл холбосон Gmail байвал сервер тэр
 *    хаяг руу 30 минутын, нэг удаагийн холбоос илгээнэ. Холбоос энэ хуудсыг
 *    `#t=<токен>`-той нээнэ (fragment нь серверт ч Referer-т ч очдоггүй);
 *    токеныг хаягийн мөрөөс шууд арилгаад шинэ нууц үгийг асууна.
 * 2. SMS КОД (хуучин зам). Имэйлгүй, зөвхөн утастай бүртгэлд — SMS
 *    тохируулагдсан үед л. Тохируулаагүй бол «сургалтын төвд хандана уу».
 *
 * Сервер бүртгэл байгаа эсэхийг ИЛЧЛЭХГҮЙ: хариу үргэлж ижил, `channels` нь
 * хэрэглэгчийн биш СИСТЕМИЙН тохиргоо. Тиймээс энд «хэрэв … бол» гэж тайлбарлана.
 *
 * ── Яагаад 3 биш 2 алхам вэ ────────────────────────────────────────────────
 * Кодоо болон шинэ нууц үгээ нэг дор авч НЭГ л удаа шалгуулна — код урьдчилж
 * шалгах endpoint нь брутфорсын нэмэлт гадаргуу үүсгэнэ.
 *
 * ── Дизайны шийдэл (2026-08-07) ────────────────────────────────────────────
 * Алхмын заалт; «Код/имэйл ирэхгүй бол» тусламж бүтэлгүйтмэгц өөрөө нээгдэнэ;
 * кодын хугацаа харагдана; нууц үгийн шаардлага илгээхээс ӨМНӨ шалгагдана.
 */

const CODE_LENGTH = 6;
/** Дахин илгээх хүртэлх хүлээлт (сервер талд ч 15 минутад 3 удаа гэсэн хязгаартай) */
const RESEND_COOLDOWN_SEC = 60;

type Step = "identify" | "sent" | "verify" | "link" | "done";

interface ForgotResponse {
  maskedTo: string;
  expiresInSeconds: number;
  linkExpiresInSeconds?: number;
  channels?: { sms: boolean; email: boolean };
}

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

/** Имэйлийн холбоосоор нээгдсэн бол `#t=<токен>`-ийг уншиж хаягаас арилгана */
function takeLinkToken(): string | null {
  const match = /(?:^#|&)t=([A-Za-z0-9_-]{20,200})(?:&|$)/.exec(window.location.hash);
  if (!match) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return match[1];
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identify");

  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState<ForgotResponse | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
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
  const passwordRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Имэйлийн холбоосоор ирсэн эсэх. StrictMode-ийн давхар effect-д токен
  // (хаягаас аль хэдийн арилсан) алдагдахгүйн тулд ref-д хадгална. Нээлттэй
  // табд холбоосыг буулгавал зөвхөн hash солигдоно — hashchange-ийг ч сонсоно.
  const linkRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const apply = (token: string | null) => {
      if (!token) return;
      queueMicrotask(() => {
        setLinkToken(token);
        setError("");
        setStep("link");
      });
    };
    if (linkRef.current === undefined) linkRef.current = takeLinkToken();
    apply(linkRef.current);
    const onHash = () => apply(takeLinkToken());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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

  // Алхам солигдоход фокусыг зөв газар тавина
  useEffect(() => {
    if (step === "verify") codeRef.current?.focus();
    if (step === "link") passwordRef.current?.focus();
    if (step === "done" || step === "sent") headingRef.current?.focus();
  }, [step]);

  const requestReset = useCallback(
    async (isResend: boolean) => {
      if (!identifier.trim()) {
        setError("Утас, имэйл эсвэл нэвтрэх нэрээ оруулна уу");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await api<ForgotResponse>("/auth/forgot-password", {
          method: "POST",
          body: { identifier: identifier.trim() },
          auth: false,
        });
        setSent(res);
        // Хуучин сервер `channels` буцаадаггүй — тэр үед SMS гэж үзнэ
        const sms = res.channels ? res.channels.sms : true;
        setStep(sms ? "verify" : "sent");
        setCooldown(RESEND_COOLDOWN_SEC);
        setCodeLeft(sms ? res.expiresInSeconds : 0);
        setHelpOpen(false);
        if (isResend) setCode("");
      } catch (e) {
        setError(errMsg(e));
        // Илгээх бүтэлгүйтвэл тусламжийг ӨӨРӨӨ нээнэ — ажилладаг өөр зам тэр дор нь харагдана.
        setHelpOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [identifier],
  );

  function passwordProblem(): string | null {
    if (!isPasswordStrong(password)) {
      return `Нууц үг дор хаяж ${PASSWORD_MIN_LENGTH} тэмдэгт, үсэг ба тоо холилдсон байх ёстой`;
    }
    if (password !== confirm) return "Хоёр нууц үг таарахгүй байна";
    return null;
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (code.length !== CODE_LENGTH) {
      setError(`Код ${CODE_LENGTH} оронтой байна`);
      codeRef.current?.focus();
      return;
    }
    const problem = passwordProblem();
    if (problem) return setError(problem);
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

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const problem = passwordProblem();
    if (problem) return setError(problem);
    if (!linkToken) return;
    setLoading(true);
    try {
      await api("/auth/reset-password/link", {
        method: "POST",
        body: { token: linkToken, newPassword: password },
        auth: false,
      });
      setStep("done");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setStep("identify");
    setError("");
    setCode("");
    setCodeLeft(0);
    setLinkToken(null);
  }

  const codeExpired = step === "verify" && codeLeft === 0;
  const emailOn = sent?.channels?.email ?? false;
  const linkMinutes = Math.round((sent?.linkExpiresInSeconds ?? 1800) / 60);
  const stepNo = step === "identify" ? 1 : 2;

  const passwordFields = (
    <NewPasswordFields
      password={password}
      confirm={confirm}
      show={showPassword}
      inputRef={passwordRef}
      onPassword={(v) => {
        setPassword(v);
        if (error) setError("");
      }}
      onConfirm={(v) => {
        setConfirm(v);
        if (error) setError("");
      }}
      onToggleShow={() => setShowPassword((v) => !v)}
    />
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm chunky p-6 sm:p-8">
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
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-dim">Алхам {stepNo} / 2</p>
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-1 flex-1 rounded-full bg-brand-bright" />
              <span className={`h-1 flex-1 rounded-full transition ${stepNo === 2 ? "bg-brand-bright" : "bg-line"}`} />
            </div>
          </div>
        )}

        {/* ---------- Алхам 1: хэн бэ ---------- */}
        {step === "identify" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void requestReset(false);
            }}
            noValidate
            className="space-y-4"
          >
            <div>
              <h1 className="text-lg font-bold text-ink">Нууц үг сэргээх</h1>
              <p className="mt-1.5 text-sm text-ink-dim">
                Бүртгэлд тань Gmail эсвэл имэйл холбогдсон бол тэр хаяг руу сэргээх холбоос илгээнэ
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label htmlFor="identifier" className="block text-sm font-medium text-ink">
                  Утас, имэйл эсвэл нэвтрэх нэр
                </label>
                <InfoHint label="Юу бичих вэ">
                  Нэвтрэхдээ хэрэглэдэг утасны дугаар, имэйл хаяг эсвэл холбосон Gmail хаягаа бичнэ үү.
                </InfoHint>
              </div>
              <input
                id="identifier"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError("");
                }}
                placeholder="99112233"
                autoComplete="username"
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
              className="btn-3d min-h-12 w-full rounded-2xl bg-brand-bright py-3 font-bold tracking-wide text-on-brand transition hover:brightness-105 disabled:opacity-50"
            >
              {loading ? "Илгээж байна…" : "Сэргээх холбоос авах"}
            </button>
          </form>
        )}

        {/* ---------- Алхам 2а: имэйл холбоос илгээгдлээ ---------- */}
        {step === "sent" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
              <div>
                <h1 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-ink outline-none">
                  Имэйлээ шалгана уу
                </h1>
                <p className="mt-1.5 text-sm text-ink-dim">
                  <span className="font-semibold text-ink">{sent?.maskedTo}</span> бүртгэлд Gmail эсвэл имэйл
                  холбогдсон бол тэр хаяг руу нууц үг сэргээх холбоос илгээлээ. Холбоос {linkMinutes} минут
                  хүчинтэй, нэг л удаа ажиллана.
                </p>
              </div>
            </div>
            <p className="rounded-xl border border-line bg-panel p-3 text-sm text-ink">
              Бүртгэл тань зөвхөн утастай, имэйлгүй бол сургалтын төвд хандаж нууц үгээ сэргээлгэнэ үү.
            </p>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => void requestReset(true)}
                disabled={cooldown > 0 || loading}
                className="min-h-11 font-medium text-brand transition hover:underline disabled:text-ink-dim disabled:no-underline"
              >
                {cooldown > 0 ? `Дахин илгээх (${cooldown}с)` : "Дахин илгээх"}
              </button>
              <button type="button" onClick={restart} className="min-h-11 text-ink-dim transition hover:text-ink">
                Өөр хаяг оруулах
              </button>
            </div>
            <ErrorLine id="fp-error" message={error} />
          </div>
        )}

        {/* ---------- Алхам 2б: SMS код + шинэ нууц үг ---------- */}
        {step === "verify" && (
          <form onSubmit={submitCode} noValidate className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-ink">Код оруулах</h1>
              <p className="mt-1.5 text-sm text-ink-dim">
                <span className="font-semibold text-ink">{sent?.maskedTo}</span> дугаар руу {CODE_LENGTH} оронтой
                код илгээлээ
              </p>
              {emailOn && (
                <p className="mt-2 flex items-start gap-2 rounded-xl border border-brand/25 bg-brand/5 px-3 py-2 text-xs text-ink">
                  <MailCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  Бүртгэлд Gmail эсвэл имэйл холбогдсон бол код биш, сэргээх холбоос имэйлээр очно
                </p>
              )}
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
                  // Зөвхөн цифр — SMS-ээс хуулахад орсон зай, зураасыг цэвэрлэнэ
                  setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
                  if (error) setError("");
                }}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                className={`${inputCls} text-center font-mono text-2xl tracking-[0.5em]`}
              />
              <p className={`mt-2 text-xs ${codeExpired ? "text-error" : "text-ink-dim"}`} aria-live="polite">
                {codeExpired
                  ? "Кодын хугацаа дууслаа. Дахин илгээнэ үү."
                  : `Код ${mmss(codeLeft)}-ын дараа хүчингүй болно.`}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => void requestReset(true)}
                  disabled={cooldown > 0 || loading}
                  className="min-h-9 font-medium text-brand transition hover:underline disabled:text-ink-dim disabled:no-underline"
                >
                  {cooldown > 0 ? `Дахин илгээх (${cooldown}с)` : "Код дахин илгээх"}
                </button>
                <button type="button" onClick={restart} className="min-h-9 text-ink-dim transition hover:text-ink">
                  Дугаар солих
                </button>
              </div>
            </div>

            {passwordFields}
            <ErrorLine id="fp-error" message={error} />
            <SubmitButton loading={loading} disabled={!isPasswordStrong(password)} />
          </form>
        )}

        {/* ---------- Алхам 2в: имэйлийн холбоосоор шинэ нууц үг ---------- */}
        {step === "link" && (
          <form onSubmit={submitLink} noValidate className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-ink">Шинэ нууц үг</h1>
              <p className="mt-1.5 text-sm text-ink-dim">
                Имэйлээр ирсэн холбоос — шинэ нууц үгээ хоёр удаа бичнэ үү
              </p>
            </div>
            {passwordFields}
            <ErrorLine id="fp-error" message={error} />
            <SubmitButton loading={loading} disabled={!isPasswordStrong(password)} />
            {error && (
              <button type="button" onClick={restart} className="min-h-11 w-full text-sm font-medium text-brand hover:underline">
                Шинэ холбоос авах
              </button>
            )}
          </form>
        )}

        {/* ---------- Боллоо ---------- */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              <div>
                <h1 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-ink outline-none">
                  Нууц үг солигдлоо
                </h1>
                <p className="mt-1.5 text-sm text-ink-dim">
                  Шинэ нууц үгээрээ нэвтэрнэ үү. Бусад төхөөрөмж дээрх нэвтрэлт аюулгүй байдлын үүднээс тасарсан.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="btn-3d min-h-12 w-full rounded-2xl bg-brand-bright py-3 font-bold tracking-wide text-on-brand transition hover:brightness-105"
            >
              Нэвтрэх
            </button>
          </div>
        )}

        {/* ---------- Ирэхгүй бол ----------
            Хэрэглэгч хүлээгээд ирэхгүй бол юу ч хийхгүй орхиод явдаг. Тиймээс
            бодит шалтгаан бүр болон АЖИЛЛАДАГ өөр зам энд бичигдсэн. */}
        {step !== "done" && step !== "link" && (
          <div className="mt-5 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              aria-expanded={helpOpen}
              aria-controls="fp-help"
              className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-medium text-ink transition hover:text-brand"
            >
              Имэйл, код ирэхгүй байна уу?
              <ChevronDown
                aria-hidden
                className={`h-4 w-4 shrink-0 text-ink-dim transition-transform ${helpOpen ? "rotate-180" : ""}`}
              />
            </button>

            {helpOpen && (
              <ul id="fp-help" className="mt-3 space-y-2.5 text-sm text-ink-dim">
                <li>
                  <span className="font-medium text-ink">Спам хавтсаа шалгана уу.</span> Имэйл 1–2 минут саатаж, заримдаа
                  «Спам» хэсэгт ордог.
                </li>
                <li>
                  <span className="font-medium text-ink">Gmail холбосон эсэхээ шалгана уу.</span> Холбоос зөвхөн
                  бүртгэлдээ нэмсэн имэйл эсвэл «Миний мэдээлэл»-ээс холбосон Gmail руу очно.
                </li>
                <li>
                  <span className="font-medium text-ink">Бичсэнээ шалгана уу.</span> Утасны дугаараа 8 оронтойгоор, зайгүй
                  бичнэ.
                </li>
                <li className="rounded-xl border border-line bg-panel p-3 text-ink">
                  <span className="font-semibold">Сургалтын төвд хандана уу.</span> Багш эсвэл админ таны бүртгэлийн
                  нууц үгийг сэргээж өгнө.
                </li>
              </ul>
            )}
          </div>
        )}

        {step !== "done" && (
          <p className="mt-5 text-center text-sm">
            <Link href="/login" className="inline-flex min-h-11 items-center gap-1.5 text-ink-dim transition hover:text-ink">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Нэвтрэх хуудас руу буцах
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

/** Шинэ нууц үг + давтах — SMS ба имэйлийн аль алинд ижил */
function NewPasswordFields({
  password,
  confirm,
  show,
  inputRef,
  onPassword,
  onConfirm,
  onToggleShow,
}: {
  password: string;
  confirm: string;
  show: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
  onToggleShow: () => void;
}) {
  const matches = confirm.length > 0 && password === confirm;
  return (
    <>
      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-ink">
          Шинэ нууц үг
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id="new-password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            autoComplete="new-password"
            aria-describedby="pw-rule"
            className={`${inputCls} pr-12`}
          />
          <button
            type="button"
            onClick={onToggleShow}
            aria-label={show ? "Нууц үгийг нуух" : "Нууц үгийг харах"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-dim transition hover:text-ink"
          >
            {show ? <EyeOff aria-hidden className="h-5 w-5" /> : <Eye aria-hidden className="h-5 w-5" />}
          </button>
        </div>
        {/* Шаардлагыг (8+ тэмдэгт, үсэг, тоо) илгээхээс ӨМНӨ шалгаж харуулна */}
        <PasswordChecklist id="pw-rule" value={password} />
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-ink">
          Шинэ нууц үг давтах
        </label>
        <input
          id="confirm-password"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => onConfirm(e.target.value)}
          autoComplete="new-password"
          aria-describedby="pw-match"
          className={inputCls}
        />
        <p
          id="pw-match"
          aria-live="polite"
          className={`mt-1.5 flex items-center gap-1.5 text-xs ${
            confirm.length === 0 ? "text-ink-dim" : matches ? "text-success" : "text-error"
          }`}
        >
          {confirm.length > 0 &&
            (matches ? (
              <>
                <Check aria-hidden className="h-3.5 w-3.5 shrink-0" />
                Таарч байна
              </>
            ) : (
              "Хоёр нууц үг таарахгүй байна"
            ))}
        </p>
      </div>
    </>
  );
}

function SubmitButton({ loading, disabled }: { loading: boolean; disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      aria-busy={loading}
      className="btn-3d min-h-12 w-full rounded-2xl bg-brand-bright py-3 font-bold tracking-wide text-on-brand transition hover:brightness-105 disabled:opacity-50"
    >
      {loading ? "Хадгалж байна…" : "Нууц үг солих"}
    </button>
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
