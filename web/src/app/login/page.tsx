"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, TriangleAlert } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import InfoHint from "@/components/ui/InfoHint";
import { api, homeForRole, setAuth } from "@/lib/api";

/**
 * Нэвтрэх хуудас.
 *
 * ── Дизайны шийдэл (2026-08-07) ────────────────────────────────────────────
 *
 * ЯАГААД ТАЙЛБАР ТЕКСТ InfoHint ДОТОР ВЭ:
 * Өмнө нь талбар бүрийн доор байнга харагдах тайлбар догол мөр байсан. Тэр нь
 * эзний 4-р дүрмийг ("жижиг тайлбар бичвэр олшруулахгүй — цэвэрхэн ухаалаг
 * дизайныг хямд харагдуулдаг") зөрчиж байв. Гэхдээ мэдээлэл нь ӨӨРӨӨ хэрэгтэй:
 * "нууц үг чинь утасны дугаар" гэдгийг мэдэхгүй хэрэглэгч гацна.
 * Шийдэл — мэдээллийг УСТГААГҮЙ, зөвхөн "i" тэмдгийн ард нуусан. Мэддэг хүнд
 * дэлгэц цэвэр, мэдэхгүй хүнд нэг товшилтын зайд.
 *
 * ЯАГААД "НУУЦ ҮГ ХАРАХ" ТОВЧ ЗААВАЛ ХЭРЭГТЭЙ ВЭ:
 * Эзний дүрмээр анхны нууц үг = 8 оронтой утасны дугаар. Од болгон нуусан
 * 8 оронтой тоог хүн шалгах ямар ч аргагүй — нэг цифр буруу дарсныг мэдэхгүй,
 * зөвхөн "буруу" гэсэн хариу авна. Энэ бол нэвтэрч чадахгүй байх хамгийн
 * түгээмэл шалтгаан. Товч нь өгөгдмөл ХААЛТТАЙ (мөрдөгчөөс хамгаална),
 * зөвхөн хэрэглэгч өөрөө дарвал нээгдэнэ.
 *
 * ХОЁР УДАА БУРУУ ОРОЛДСОНЫ ДАРАА:
 * "Нууц үгээ мартсан уу?" холбоосыг ТОД болгож дээш гаргана. Судалгаагаар
 * хэрэглэгч 3 дахь оролдлогын дараа орхиж явдаг тул сэргээх зам тэр мөчид
 * нүдэнд харагдах ёстой.
 */

interface FieldErrors {
  identifier?: string;
  password?: string;
}

/** Хэдэн удаа буруу оролдсоны дараа сэргээх замыг тод болгох вэ */
const HELP_AFTER_ATTEMPTS = 2;

const inputCls =
  "w-full rounded-xl border bg-bg px-4 py-3 text-ink outline-none transition placeholder:text-ink-dim/70 focus:border-brand";

export default function LoginPage() {
  const router = useRouter();
  // Утас, имэйл, нэвтрэх нэр — гурвуулаа нэг талбараар. Backend /auth/login
  // "identifier"-ийг гурвуулангаар нь шалгадаг (auth.service.ts).
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  // Өгөгдмөл ХААЛТТАЙ. Агент нэг үе үүнийг `true` болгосон («8 оронтой дугаарыг
  // харах ёстой») — гэвч энэ нь мөрдөгчид (shoulder surfing) нээлттэй болгоно.
  // Анхны нууц үг нь утасны дугаар учир нууц биш ч, хэрэглэгч солисны дараа
  // ЖИНХЭНЭ нууц үг ил гарна. Нүдээр шалгах хэрэгцээг «харах» товч хангана —
  // хэрэглэгч өөрөө шийднэ.
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState("");
  const [failCount, setFailCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // localStorage дээрээс сүүлийнх оруулсан утас/имэйлийг ачаалана
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("login_identifier") : null;
    if (saved) setIdentifier(saved);
  }, []);

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!identifier.trim()) {
      errs.identifier = "Утас, имэйл эсвэл нэвтрэх нэрээ оруулна уу";
    }
    if (!password) {
      errs.password = "Нууц үгээ оруулна уу";
    }
    setFieldErrors(errs);
    // Анхны алдаатай талбарт фокус тавина — гарын хэрэглэгч болон дэлгэц
    // уншигч аль алинд нь хаана алдаа гарснаа шууд мэдэгдэнэ.
    if (errs.identifier) identifierRef.current?.focus();
    else if (errs.password) passwordRef.current?.focus();
    return Object.keys(errs).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api<{ accessToken: string; role: string }>(
        "/auth/login",
        { method: "POST", body: { identifier, password }, auth: false },
      );
      // Амжилттай нэвтэрсний дараа утас/имэйлийг localStorage-д хадгалаа
      if (typeof window !== "undefined") {
        localStorage.setItem("login_identifier", identifier);
      }
      setAuth(res.accessToken, res.role);
      router.push(homeForRole(res.role));
    } catch (err) {
      // Backend нь аль талбар буруу болохыг ЗОРИУДААР хэлдэггүй (хэрэглэгч
      // байгаа эсэхийг илчлэхгүйн тулд). Тиймээс алдааг маягтын ЁРОНХИЙ
      // хэсэгт харуулна — талбарын аль нэгийг "буруу" гэж заахгүй.
      setAuthError(err instanceof Error ? err.message : "Алдаа гарлаа");
      setFailCount((n) => n + 1);
      passwordRef.current?.focus();
      passwordRef.current?.select();
    } finally {
      setLoading(false);
    }
  }

  const showHelp = failCount >= HELP_AFTER_ATTEMPTS;

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

        <h1 className="text-lg font-bold text-ink">Нэвтрэх</h1>
        <p className="mt-1 mb-5 text-sm text-ink-dim">
          Сургалтын төвийн бүртгэлээрээ орно уу.
        </p>

        <form onSubmit={submit} noValidate className="space-y-4">
          {/* ---------- Хэн бэ ---------- */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="identifier" className="block text-sm font-medium text-ink">
                Утас, имэйл эсвэл нэвтрэх нэр
              </label>
              <InfoHint label="Юу бичих вэ">
                Гурвын аль нэгээр нэвтэрч болно — бүртгүүлэхдээ өгсөн{" "}
                <span className="font-semibold">утасны дугаар</span>, эсвэл
                бүртгэлдээ нэмсэн имэйл хаяг, эсвэл нэвтрэх нэр. Ихэнх сурагч
                утасны дугаараа хэрэглэдэг.
              </InfoHint>
            </div>
            <input
              ref={identifierRef}
              id="identifier"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (fieldErrors.identifier) {
                  setFieldErrors((f) => ({ ...f, identifier: undefined }));
                }
              }}
              placeholder="99112233"
              autoComplete="username"
              autoFocus
              aria-describedby={fieldErrors.identifier ? "identifier-error" : undefined}
              aria-invalid={!!fieldErrors.identifier}
              className={`${inputCls} ${fieldErrors.identifier ? "border-error" : "border-line"}`}
            />
            {fieldErrors.identifier && (
              <p id="identifier-error" className="mt-1.5 text-sm text-error">
                {fieldErrors.identifier}
              </p>
            )}
          </div>

          {/* ---------- Нууц үг ---------- */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                Нууц үг
              </label>
              <InfoHint label="Нууц үгээ мэдэхгүй байна уу">
                Анх удаа нэвтэрч байгаа бол нууц үг тань{" "}
                <span className="font-semibold">утасны дугаар</span> (8 орон).
                Нэвтэрсний дараа «Миний мэдээлэл» хуудаснаас өөрчилж болно.
              </InfoHint>
            </div>
            <div className="relative">
              <input
                ref={passwordRef}
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((f) => ({ ...f, password: undefined }));
                  }
                  if (authError) setAuthError("");
                }}
                autoComplete="current-password"
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                aria-invalid={!!fieldErrors.password || !!authError}
                className={`${inputCls} pr-12 ${
                  fieldErrors.password || authError ? "border-error" : "border-line"
                }`}
              />
              {/* Харах/нуух — 8 оронтой дугаарыг нүдээр шалгах цорын ганц арга.
                  Маягтыг илгээхээс сэргийлж type="button". */}
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
            {fieldErrors.password && (
              <p id="password-error" className="mt-1.5 text-sm text-error">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* ---------- Нэвтрэлтийн алдаа ----------
              aria-live тул дэлгэц уншигч алдааг ӨӨРӨӨ зарлана. role="alert"
              биш polite — хэрэглэгчийн бичиж байгааг таслахгүй. */}
          <div aria-live="polite" aria-atomic="true">
            {authError && (
              <p className="flex items-start gap-2 rounded-xl border border-error/40 bg-error/10 px-3 py-2.5 text-sm text-ink">
                <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                <span>{authError}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-xl bg-brand-bright py-3 font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
          </button>
        </form>

        {/* ---------- Сэргээх зам ----------
            Хоёр удаа бүтэлгүйтсэний дараа энэ нь жижиг холбоос байхаа болиод
            тод товч болно. Гурав дахь оролдлогын дараа хэрэглэгч орхиж явдаг
            тул сэргээх зам яг тэр мөчид нүдэнд харагдах ёстой. */}
        {showHelp ? (
          <Link
            href="/forgot-password"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/10"
          >
            <KeyRound aria-hidden className="h-4 w-4" />
            Нууц үгээ сэргээх
          </Link>
        ) : (
          <p className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="text-brand hover:underline">
              Нууц үгээ мартсан уу?
            </Link>
          </p>
        )}

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-center text-sm text-ink-dim">
            Шинэ хэрэглэгч үү?{" "}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              Бүртгүүлэх
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
