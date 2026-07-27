"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LogoMark from "@/components/LogoMark";
import { api, homeForRole, setAuth } from "@/lib/api";

interface FieldErrors {
  identifier?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  // Утас, имэйл, username аль нэгээр нэвтэрнэ — backend /auth/login
  // "identifier" талбарыг гурвуулаа шалгадаг (auth.service.ts)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!identifier.trim()) {
      errs.identifier = "Утас, имэйл эсвэл нэвтрэх нэрээ оруулна уу";
    }
    if (!password) {
      errs.password = "Нууц үгээ оруулна уу";
    }
    setFieldErrors(errs);
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
      setAuth(res.accessToken, res.role);
      router.push(homeForRole(res.role));
    } catch (err) {
      // Backend ямар талбар буруу болохыг ялгаж хэлдэггүй (нууцлалын үүднээс) тул
      // алдааг нууц үгийн талбарын дор inline харуулна — дэлгэцийн дээд талд
      // тусдаа banner биш.
      setAuthError(err instanceof Error ? err.message : "Алдаа гарлаа");
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

        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-ink">
              Утас, имэйл эсвэл нэвтрэх нэр
            </label>
            <p id="identifier-hint" className="mb-1.5 text-xs text-ink-dim">
              Гурвын аль нэгээр нэвтэрч болно: утасны дугаар, имэйл хаяг, эсвэл нэвтрэх нэр
            </p>
            <input
              id="identifier"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (fieldErrors.identifier) setFieldErrors((f) => ({ ...f, identifier: undefined }));
              }}
              placeholder="99112233 / you@gmail.com / username"
              autoComplete="username"
              aria-describedby={
                fieldErrors.identifier ? "identifier-hint identifier-error" : "identifier-hint"
              }
              aria-invalid={!!fieldErrors.identifier}
              className={`w-full rounded-xl border bg-bg px-4 py-3 text-ink outline-none transition focus:border-brand ${
                fieldErrors.identifier ? "border-error" : "border-line"
              }`}
            />
            {fieldErrors.identifier && (
              <p id="identifier-error" role="alert" className="mt-1.5 text-sm text-error">
                {fieldErrors.identifier}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              Нууц үг
            </label>
            <p id="password-hint" className="mb-1.5 text-xs text-ink-dim">
              Анх удаа нэвтэрч байгаа бол нууц үг тань 8 оронтой утасны дугаар
            </p>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                if (authError) setAuthError("");
              }}
              autoComplete="current-password"
              aria-describedby={
                fieldErrors.password || authError ? "password-hint password-error" : "password-hint"
              }
              aria-invalid={!!fieldErrors.password || !!authError}
              className={`w-full rounded-xl border bg-bg px-4 py-3 text-ink outline-none transition focus:border-brand ${
                fieldErrors.password || authError ? "border-error" : "border-line"
              }`}
            />
            {(fieldErrors.password || authError) && (
              <p id="password-error" role="alert" className="mt-1.5 text-sm text-error">
                {fieldErrors.password || authError}
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

        <p className="mt-5 text-center text-sm text-ink-dim">
          Шинэ хэрэглэгч үү?{" "}
          <Link href="/register" className="text-brand hover:underline">
            Бүртгүүлэх
          </Link>
        </p>
      </div>
    </main>
  );
}
