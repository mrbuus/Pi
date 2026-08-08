"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import InfoHint from "@/components/ui/InfoHint";
import { api, homeForRole, setAuth } from "@/lib/api";
import SubjectPicker, { type Subject } from "@/components/landing/SubjectPicker";

type Kind = "CLASSROOM" | "ONLINE" | "PARENT" | "BUYER";
// Сервер (RegisterDto.subject) хараахан олон хичээл авдаггүй, зөвхөн энэ
// 3 хуучин утгыг хүлээж авдаг тул сурагчийн кодын үсгийг тодорхойлохын
// тулд шинэ subjects[]-ээс энэ рүү буулгана (leads.service.ts-ийн
// toLegacyLeadSubject-тэй яг ижил дүрэм): ганц MATH/SOCIAL_STUDIES бол
// шууд тэрийг нь, бусад бүх тохиолдолд (олон хичээл, эсвэл SAT ганцаараа)
// BOTH — өөрөөр хэлбэл кодын үсэг B.
type LegacyRegisterSubject = "MATH" | "SOCIAL_STUDIES" | "BOTH";
function toLegacyRegisterSubject(subjects: Subject[]): LegacyRegisterSubject {
  if (subjects.length === 1) {
    if (subjects[0] === "MATH") return "MATH";
    if (subjects[0] === "SOCIAL_STUDIES") return "SOCIAL_STUDIES";
  }
  return "BOTH";
}

const KINDS: { value: Kind; title: string; desc: string }[] = [
  {
    value: "CLASSROOM",
    title: "Танхимын сурагч",
    desc: "Сургалтын төвд суралцдаг — багшаас өнөөдрийн код авна",
  },
  {
    value: "ONLINE",
    title: "Онлайн сурагч",
    desc: "Гэрээсээ өөрийн хурдаар — эрх аваад шууд суралцана",
  },
  {
    value: "BUYER",
    title: "Зүгээр үзэх",
    desc: "Бодлого, ном, тестийг багцаар худалдаж авна",
  },
  {
    value: "PARENT",
    title: "Эцэг эх",
    desc: "Хүүхдийнхээ ирц, даалгавар, шалгалтын дүнг харна",
  },
];

const GRADES = [9, 10, 11, 12];

interface FieldErrors {
  lastName?: string;
  firstName?: string;
  phone?: string;
  activationCode?: string;
  subjects?: string;
}

interface RegisterResult {
  role: string;
  studentCode?: string;
}

function isStudentKind(kind: Kind): kind is "CLASSROOM" | "ONLINE" {
  return kind === "CLASSROOM" || kind === "ONLINE";
}

export default function RegisterPage() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    grade: "12",
    school: "",
    activationCode: "",
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [copied, setCopied] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (fieldErrors[k as keyof FieldErrors]) {
      setFieldErrors((e) => ({ ...e, [k]: undefined }));
    }
  }

  function validate(activeKind: Kind): boolean {
    const errs: FieldErrors = {};
    if (!form.lastName.trim()) errs.lastName = "Овгоо оруулна уу";
    if (!form.firstName.trim()) errs.firstName = "Нэрээ оруулна уу";
    if (!/^\d{8}$/.test(form.phone)) {
      errs.phone = "Утасны дугаар яг 8 оронтой байх ёстой";
    }
    if (activeKind === "CLASSROOM" && !/^\d{8}$/.test(form.activationCode)) {
      errs.activationCode = "Багшаас авсан 8 оронтой кодоо оруулна уу";
    }
    if (isStudentKind(activeKind) && subjects.length === 0) {
      errs.subjects = "Дор хаяж нэг хичээл сонгоно уу";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!kind) return;
    if (!validate(kind)) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        phone: form.phone,
        firstName: form.firstName,
        lastName: form.lastName,
      };
      if (kind === "PARENT") {
        body.asParent = true;
      }
      if (isStudentKind(kind)) {
        body.studentType = kind;
        body.grade = parseInt(form.grade, 10);
        // Сервер олон хичээл авдаггүй (RegisterDto.subject хуучин 3 утга) тул
        // энд буулгана — logic register.dto.ts-ийн тайлбарыг үз.
        body.subject = toLegacyRegisterSubject(subjects);
        if (form.school) body.school = form.school;
      }
      if (kind === "CLASSROOM") body.activationCode = form.activationCode;

      const res = await api<{
        accessToken: string;
        role: string;
        studentCode?: string;
      }>("/auth/register", { method: "POST", body, auth: false });
      setAuth(res.accessToken, res.role);

      if (isStudentKind(kind) && res.studentCode) {
        // Сурагчийн кодыг эндээс тэр даруй харуулна — нэвтэрсний дараа биш,
        // яг үүсгэсэн мөчид (энэ бол кодыг чухалчилж харуулах цорын ганц мөч)
        setResult({ role: res.role, studentCode: res.studentCode });
      } else {
        router.push(homeForRole(res.role));
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!result?.studentCode) return;
    try {
      await navigator.clipboard.writeText(result.studentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API боломжгүй үед ч кодыг дэлгэцэн дээр харуулсан хэвээр байна
    }
  }

  // Амжилттай бүртгэгдээд сурагчийн код гарсан бол — кодыг онцолж харуулна
  if (result?.studentCode) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4 text-success" aria-hidden />
            <p className="text-sm font-semibold text-success">Бүртгэл амжилттай үүслээ</p>
          </div>
          <h1 className="mt-3 text-lg font-bold text-ink">Таны сурагчийн код</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Энэ бол таны сургалтын төв дэх байнгын танигдах код. Шалгалт, дэвтэр,
            гэрчилгээ бүх газар энэ кодоор тань таних тул хадгалж авна уу.
          </p>

          <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-4">
            <span className="font-mono text-2xl font-extrabold tracking-wider text-ink">
              {result.studentCode}
            </span>
          </div>

          <button
            type="button"
            onClick={copyCode}
            className="mt-3 w-full rounded-xl border border-line bg-bg py-2.5 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-75"
            disabled={copied}
          >
            {copied ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" aria-hidden />
                Хуулагдлаа
              </span>
            ) : (
              "Кодыг хуулах"
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push(homeForRole(result.role))}
            className="mt-3 w-full rounded-xl bg-brand-bright py-3 font-bold text-on-brand transition hover:opacity-90"
          >
            Үргэлжлүүлэх
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <div className="mb-6">
          <Link
            href="/"
            aria-label="Pi.mn үндсэн нүүр"
            className="inline-flex rounded-xl outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-brand-bright/70"
          >
            <LogoMark variant="full" size={58} priority />
          </Link>
          <p className="mt-2 text-sm font-semibold text-brand">Бүртгэл үүсгэх</p>
        </div>

        {/* Алхам 1: Та хэн бэ? Эхлээд үүнийг сонговол ЗӨВХӨН хэрэгтэй талбарууд харагдана */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">1. Та хэн бэ?</h2>
            {kind && (
              <button
                type="button"
                onClick={() => setKind(null)}
                className="text-xs font-medium text-brand hover:underline"
              >
                Өөрчлөх
              </button>
            )}
          </div>

          {kind ? (
            <div className="rounded-xl border border-brand/30 bg-brand/10 p-3">
              <p className="text-sm font-semibold text-ink">
                {KINDS.find((k) => k.value === kind)?.title}
              </p>
            </div>
          ) : (
            <div role="radiogroup" aria-label="Та хэн бэ?" className="space-y-2">
              {KINDS.map((k) => (
                <label
                  key={k.value}
                  className="block cursor-pointer rounded-xl border border-line p-3 transition hover:border-brand/50"
                >
                  <input
                    type="radio"
                    name="kind"
                    value={k.value}
                    checked={kind === k.value}
                    onChange={() => {
                      setKind(k.value);
                      // Танхим/онлайн сонголт өөрчлөгдвөл өмнөх хичээлийн
                      // сонголт (шинэ төрөлд зөвшөөрөгдөхгүй байж болзошгүй
                      // тул) цэвэрлэнэ — жишээ нь Нийгэм судлал сонгоод дараа
                      // нь Онлайн руу шилжсэн бол чимээгүй дамжуулахгүй.
                      setSubjects([]);
                    }}
                    className="sr-only"
                  />
                  <p className="text-sm font-semibold text-ink">{k.title}</p>
                  <p className="mt-0.5 text-xs text-ink-dim">{k.desc}</p>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Алхам 2: тухайн төрөлд хэрэгтэй мэдээлэл */}
        {kind && (
          <form onSubmit={submit} noValidate className="space-y-3">
            <h2 className="text-sm font-semibold text-ink">2. Мэдээллээ бөглөнө үү</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lastName" className="sr-only">
                  Овог
                </label>
                <input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  placeholder="Овог"
                  aria-invalid={!!fieldErrors.lastName}
                  aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                  className={`w-full rounded-xl border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand ${
                    fieldErrors.lastName ? "border-error" : "border-line"
                  }`}
                />
                {fieldErrors.lastName && (
                  <p id="lastName-error" role="alert" className="mt-1 text-xs text-error">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="firstName" className="sr-only">
                  Нэр
                </label>
                <input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  placeholder="Нэр"
                  aria-invalid={!!fieldErrors.firstName}
                  aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                  className={`w-full rounded-xl border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand ${
                    fieldErrors.firstName ? "border-error" : "border-line"
                  }`}
                />
                {fieldErrors.firstName && (
                  <p id="firstName-error" role="alert" className="mt-1 text-xs text-error">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label htmlFor="phone" className="block text-sm font-medium text-ink">
                  Утасны дугаар
                </label>
                <InfoHint label="Нууц үг чинь юу вэ">
                  Эхний нууц үг тань энэ утасны дугаар (8 орон) байна. Нэвтэрсний
                  дараа «Миний мэдээлэл» хуудаснаас өөрчилж болно.
                </InfoHint>
              </div>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="99112233"
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                className={`w-full rounded-xl border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand ${
                  fieldErrors.phone ? "border-error" : "border-line"
                }`}
              />
              {fieldErrors.phone && (
                <p id="phone-error" role="alert" className="mt-1 text-xs text-error">
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            {isStudentKind(kind) && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="grade" className="mb-1 block text-xs text-ink-dim">
                      Анги
                    </label>
                    <select
                      id="grade"
                      value={form.grade}
                      onChange={(e) => set("grade", e.target.value)}
                      className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}-р анги
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="school" className="mb-1 block text-xs text-ink-dim">
                      Сургууль (заавал биш)
                    </label>
                    <input
                      id="school"
                      value={form.school}
                      onChange={(e) => set("school", e.target.value)}
                      placeholder="Сургууль"
                      className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div>
                  <SubjectPicker
                    value={subjects}
                    onChange={(next) => {
                      setSubjects(next);
                      if (fieldErrors.subjects) {
                        setFieldErrors((errs) => ({ ...errs, subjects: undefined }));
                      }
                    }}
                    studentType={kind}
                    legend="Ямар хичээлээр суралцах вэ?"
                  />
                  {fieldErrors.subjects && (
                    <p role="alert" className="mt-1 text-xs text-error">
                      {fieldErrors.subjects}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-dim">
                    Энэ сонголт таны сурагчийн кодод тусгагдана
                  </p>
                </div>
              </>
            )}

            {kind === "CLASSROOM" && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
                <label htmlFor="activationCode" className="mb-1.5 block text-xs font-medium text-ink">
                  Багшаас авсан өнөөдрийн код
                </label>
                <input
                  id="activationCode"
                  value={form.activationCode}
                  onChange={(e) => set("activationCode", e.target.value)}
                  inputMode="numeric"
                  placeholder="ж: 20260726"
                  aria-invalid={!!fieldErrors.activationCode}
                  aria-describedby="activationCode-hint"
                  className={`w-full rounded-lg border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand ${
                    fieldErrors.activationCode ? "border-error" : "border-line"
                  }`}
                />
                <p id="activationCode-hint" className="mt-1.5 text-xs text-ink-dim">
                  Танхимын ангид бүртгүүлэхэд багшаас өнөөдрийн 8 оронтой кодыг авах шаардлагатай
                </p>
                {fieldErrors.activationCode && (
                  <p role="alert" className="mt-1 text-xs text-error">
                    {fieldErrors.activationCode}
                  </p>
                )}
              </div>
            )}

            {submitError && (
              <p role="alert" className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full rounded-xl bg-brand-bright py-3 font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Бүртгэж байна…" : "Бүртгүүлэх"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-ink-dim">
          Бүртгэлтэй юу?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Нэвтрэх
          </Link>
        </p>
      </div>
    </main>
  );
}
