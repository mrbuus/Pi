"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Clock, Check, X, Pencil, ArrowLeft, TriangleAlert, Undo2 } from "lucide-react";
import { api, getRole } from "@/lib/api";
import ActivityHeatmap from "@/components/activity/ActivityHeatmap";
import SendPasswordResetButton from "./SendPasswordResetButton";
import StudentNotesPanel from "./StudentNotesPanel";
import {
  StudentDetailData,
  StudentPaymentHistory,
  TUITION_PLAN_LABEL,
  TuitionPlanValue,
  canEditProfile,
  canSeeGuardianPhones as canSeeGuardianPhonesFn,
  errMsg,
  fullName,
  money,
} from "./types";

const METHOD_LABEL: Record<string, string> = {
  QPAY: "QPay",
  BANK_TRANSFER: "Данс",
  CASH: "Бэлэн",
};
const STATUS_LABEL: Record<string, { icon?: any; text: string; cls: string }> = {
  PENDING: { icon: Clock, text: "Хүлээгдэж буй", cls: "bg-warning/15 text-warning" },
  CONFIRMED: { icon: Check, text: "Баталгаажсан", cls: "bg-success/15 text-success" },
  REJECTED: { icon: X, text: "Цуцалсан", cls: "bg-error/15 text-error" },
  REVERSED: { icon: Undo2, text: "Буцаасан", cls: "bg-ink/10 text-ink-dim" },
};

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  school: string;
  grade: string;
  branch: string;
  section: string;
  fatherPhone: string;
  motherPhone: string;
  guardianNote: string;
  tuitionPlan: string;
  tuitionAmount: string;
  tuitionNote: string;
}

function formFromDetail(d: StudentDetailData): FormState {
  const p = d.studentProfile;
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone ?? "",
    email: d.email ?? "",
    school: p?.school ?? "",
    grade: p?.grade ? String(p.grade) : "",
    branch: p?.branch ?? "",
    section: p?.section ?? "",
    fatherPhone: p?.fatherPhone ?? "",
    motherPhone: p?.motherPhone ?? "",
    guardianNote: p?.guardianNote ?? "",
    tuitionPlan: p?.tuitionPlan ?? "",
    tuitionAmount: p?.tuitionAmount != null ? String(p.tuitionAmount) : "",
    tuitionNote: p?.tuitionNote ?? "",
  };
}

// Зөвхөн ӨӨРЧЛӨГДСӨН, хүчинтэй талбаруудыг цуглуулж PATCH /users/:id/profile
// рүү явуулна (backend бүх талбарыг optional partial patch болгож хүлээж авна —
// UpdateUserProfileDto). Утас/имэйл шиг validation-той талбарыг хоосон бол
// ЯВУУЛАХГҮЙ (тэдгээрийг энэ маягтаар "цэвэрлэх" боломжгүй — зөвхөн солих).
function buildPatchBody(form: FormState, orig: StudentDetailData, showGuardians: boolean) {
  const body: Record<string, unknown> = {};
  const p = orig.studentProfile;

  const fn = form.firstName.trim();
  if (fn && fn !== orig.firstName) body.firstName = fn;
  const ln = form.lastName.trim();
  if (ln && ln !== orig.lastName) body.lastName = ln;
  const phone = form.phone.trim();
  if (phone && phone !== (orig.phone ?? "")) body.phone = phone;
  const email = form.email.trim();
  if (email && email !== (orig.email ?? "")) body.email = email;

  const school = form.school.trim();
  if (school !== (p?.school ?? "")) body.school = school;
  const gradeNum = form.grade ? parseInt(form.grade, 10) : undefined;
  if (gradeNum && gradeNum !== p?.grade) body.grade = gradeNum;
  const branch = form.branch.trim();
  if (branch !== (p?.branch ?? "")) body.branch = branch;
  const section = form.section.trim();
  if (section !== (p?.section ?? "")) body.section = section;

  if (showGuardians) {
    const fatherPhone = form.fatherPhone.trim();
    if (fatherPhone && fatherPhone !== (p?.fatherPhone ?? "")) body.fatherPhone = fatherPhone;
    const motherPhone = form.motherPhone.trim();
    if (motherPhone && motherPhone !== (p?.motherPhone ?? "")) body.motherPhone = motherPhone;
    const guardianNote = form.guardianNote.trim();
    if (guardianNote !== (p?.guardianNote ?? "")) body.guardianNote = guardianNote;
  }

  if (form.tuitionPlan && form.tuitionPlan !== (p?.tuitionPlan ?? "")) {
    body.tuitionPlan = form.tuitionPlan;
  }
  const amountNum = form.tuitionAmount !== "" ? parseInt(form.tuitionAmount, 10) : undefined;
  if (amountNum !== undefined && !Number.isNaN(amountNum) && amountNum !== p?.tuitionAmount) {
    body.tuitionAmount = amountNum;
  }
  const tuitionNote = form.tuitionNote.trim();
  if (tuitionNote !== (p?.tuitionNote ?? "")) body.tuitionNote = tuitionNote;

  return body;
}

function Field({
  id,
  label,
  value,
  edit,
  input,
}: {
  id: string;
  label: string;
  value: React.ReactNode;
  edit: boolean;
  input: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-ink-dim">
        {label}
      </label>
      {edit ? (
        input
      ) : (
        <p id={id} className="font-medium text-ink">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

export default function StudentDetail({ studentId }: { studentId: string }) {
  const role = getRole();
  const canEdit = canEditProfile(role);
  const showGuardians = canSeeGuardianPhonesFn(role);
  const canSeeMoney = role === "ADMIN" || role === "TEACHER_PLUS";

  const [detail, setDetail] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payments, setPayments] = useState<StudentPaymentHistory | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<StudentDetailData>(`/users/${studentId}`)
      .then(setDetail)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));

    if (canSeeMoney) {
      setPaymentsError(null);
      api<StudentPaymentHistory>(`/payments/student/${studentId}`)
        .then(setPayments)
        .catch((e) => setPaymentsError(errMsg(e)));
    }
  }, [studentId, canSeeMoney]);

  useEffect(load, [load]);

  // 🎯 Жилийн төлбөрөө бүтэн төлсөн сурагчид PAYMENT тэмдэглэл шаардлагагүй
  // (notes.service.ts assertPaymentNoteAllowed-тэй яг тохирсон нөхцөл) — эндээс
  // мэдэхгүй бол (payments дата ирээгүй, ж: энгийн Багш) урьдчилж хаахгүй,
  // backend-ийн алдааны мессежийг л шууд харуулна.
  const paymentNotesBlocked = !!(
    payments &&
    payments.tuitionPlan === "FULL_YEAR" &&
    payments.payments.some((p) => p.status === "CONFIRMED")
  );

  function startEdit() {
    if (!detail) return;
    setForm(formFromDetail(detail));
    setMsg(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm(null);
  }

  async function save() {
    if (!detail || !form) return;
    const body = buildPatchBody(form, detail, showGuardians);
    if (Object.keys(body).length === 0) {
      setEditing(false);
      return;
    }
    const prev = detail;
    setSaving(true);
    setMsg(null);
    // Оптимист — засвараа шууд дэлгэцэнд тусгаад, амжилтгүй бол буцаана.
    setDetail((cur) =>
      cur
        ? {
            ...cur,
            ...("firstName" in body ? { firstName: body.firstName as string } : {}),
            ...("lastName" in body ? { lastName: body.lastName as string } : {}),
            ...("phone" in body ? { phone: body.phone as string } : {}),
            ...("email" in body ? { email: body.email as string } : {}),
            studentProfile: cur.studentProfile
              ? {
                  ...cur.studentProfile,
                  ...("school" in body ? { school: body.school as string } : {}),
                  ...("grade" in body ? { grade: body.grade as number } : {}),
                  ...("branch" in body ? { branch: body.branch as string } : {}),
                  ...("section" in body ? { section: body.section as string } : {}),
                  ...("fatherPhone" in body
                    ? { fatherPhone: body.fatherPhone as string }
                    : {}),
                  ...("motherPhone" in body
                    ? { motherPhone: body.motherPhone as string }
                    : {}),
                  ...("guardianNote" in body
                    ? { guardianNote: body.guardianNote as string }
                    : {}),
                  ...("tuitionPlan" in body
                    ? { tuitionPlan: body.tuitionPlan as TuitionPlanValue }
                    : {}),
                  ...("tuitionAmount" in body
                    ? { tuitionAmount: body.tuitionAmount as number }
                    : {}),
                  ...("tuitionNote" in body
                    ? { tuitionNote: body.tuitionNote as string }
                    : {}),
                }
              : cur.studentProfile,
          }
        : cur,
    );

    try {
      await api(`/users/${studentId}/profile`, { method: "PATCH", body });
      setMsg({ kind: "success", text: "Хадгалагдлаа" });
      setEditing(false);
      load(); // серверийн бодит утгаар дахин баталгаажуулна
    } catch (e) {
      setDetail(prev); // rollback
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus-visible:border-brand";

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-panel" />
        <div className="h-40 animate-pulse rounded-2xl border border-line bg-panel" />
        <p className="sr-only">Ачаалж байна…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
        <p className="font-semibold text-error">{error}</p>
        <button
          onClick={load}
          className="mt-3 rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition hover:opacity-90"
        >
          Дахин оролдох
        </button>
      </div>
    );
  }
  if (!detail) return null;

  const p = detail.studentProfile;
  const f = form;

  return (
    <div className="space-y-6">
      <Link
        href="/app/admin/students"
        className="inline-flex items-center gap-1.5 text-sm text-ink-dim transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Сурагчийн жагсаалт руу буцах
      </Link>

      {/* ---- Танилцуулга / Identity ---- */}
      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink">{fullName(detail)}</h1>
            <p className="mt-0.5 font-mono text-xs text-ink-dim">
              {detail.studentCode ?? "Код тодорхойгүй"}
            </p>
          </div>
          {canEdit && !editing && (
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-dim transition hover:border-brand hover:text-brand-soft"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Мэдээлэл засах
              </button>
              {/* Нууц үгээ мартсан сурагчийг багш ГАЗАР ДЭЭР НЬ шийдэж чадах
                  ёстой — эс бөгөөс эзэн нь терминалаас скрипт ажиллуулах
                  болно. Код зөвхөн сурагчийн утас руу очно, багш харахгүй. */}
              <SendPasswordResetButton
                studentId={studentId}
                studentName={fullName(detail)}
              />
            </div>
          )}
          {editing && (
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="rounded-lg border border-line px-4 py-2 text-sm text-ink-dim transition hover:text-ink"
              >
                Болих
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-50"
              >
                {saving ? "Хадгалж байна…" : "Хадгалах"}
              </button>
            </div>
          )}
        </div>

        {msg && (
          <p
            role="status"
            className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
              msg.kind === "error" ? "bg-error/10 text-error" : "bg-success/10 text-success"
            }`}
          >
            {msg.kind === "error" ? (
              <TriangleAlert className="h-4 w-4" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
            {msg.text}
          </p>
        )}

        <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {editing && f ? (
            <>
              <Field
                id="f-lastName"
                label="Овог"
                value={null}
                edit
                input={
                  <input
                    id="f-lastName"
                    value={f.lastName}
                    onChange={(e) => setForm({ ...f, lastName: e.target.value })}
                    placeholder="Овог"
                    className={inputCls}
                  />
                }
              />
              <Field
                id="f-firstName"
                label="Нэр"
                value={null}
                edit
                input={
                  <input
                    id="f-firstName"
                    value={f.firstName}
                    onChange={(e) => setForm({ ...f, firstName: e.target.value })}
                    placeholder="Нэр"
                    className={inputCls}
                  />
                }
              />
              <Field
                id="f-phone"
                label="Утас"
                value={null}
                edit
                input={
                  <input
                    id="f-phone"
                    value={f.phone}
                    onChange={(e) => setForm({ ...f, phone: e.target.value })}
                    placeholder="88881234"
                    className={inputCls}
                  />
                }
              />
              <Field
                id="f-email"
                label="Имэйл"
                value={null}
                edit
                input={
                  <input
                    id="f-email"
                    value={f.email}
                    onChange={(e) => setForm({ ...f, email: e.target.value })}
                    placeholder="name@gmail.com"
                    className={inputCls}
                  />
                }
              />
              <Field
                id="f-school"
                label="Сургууль"
                value={null}
                edit
                input={
                  <input
                    id="f-school"
                    value={f.school}
                    onChange={(e) => setForm({ ...f, school: e.target.value })}
                    className={inputCls}
                  />
                }
              />
              <Field
                id="f-grade"
                label="Анги (жил)"
                value={null}
                edit
                input={
                  <select
                    id="f-grade"
                    value={f.grade}
                    onChange={(e) => setForm({ ...f, grade: e.target.value })}
                    className={`bg-bg ${inputCls}`}
                  >
                    <option value="">—</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>
                        {g}-р анги
                      </option>
                    ))}
                  </select>
                }
              />
              <Field
                id="f-section"
                label="Секц"
                value={null}
                edit
                input={
                  <input
                    id="f-section"
                    value={f.section}
                    onChange={(e) => setForm({ ...f, section: e.target.value })}
                    placeholder="ж: 12-2"
                    className={inputCls}
                  />
                }
              />
              <Field
                id="f-branch"
                label="Салбар"
                value={null}
                edit
                input={
                  <input
                    id="f-branch"
                    value={f.branch}
                    onChange={(e) => setForm({ ...f, branch: e.target.value })}
                    placeholder="ж: Баруун 4"
                    className={inputCls}
                  />
                }
              />
            </>
          ) : (
            <>
              <Field id="v-phone" label="Утас" value={detail.phone} edit={false} input={null} />
              <Field id="v-email" label="Имэйл" value={detail.email} edit={false} input={null} />
              <Field
                id="v-school"
                label="Сургууль"
                value={p?.school}
                edit={false}
                input={null}
              />
              <Field
                id="v-classroom"
                label="Анги"
                value={detail.currentClassroom?.name ?? (p?.grade ? `${p.grade}-р анги` : null)}
                edit={false}
                input={null}
              />
              <Field id="v-section" label="Секц" value={p?.section} edit={false} input={null} />
              <Field id="v-branch" label="Салбар" value={p?.branch} edit={false} input={null} />
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm text-ink-dim">
          <span>Даалгавар биелүүлсэн: {detail.counts.assignmentsCompleted}</span>
          <span>Шалгалтын дүн: {detail.counts.testResults}</span>
          <span>Ирц бүртгэл: {detail.counts.attendanceRecords}</span>
          <span>Бодсон бодлого: {detail.counts.attempts}</span>
        </div>
      </section>

      {/* ---- Эцэг эх — зөвхөн ADMIN/TEACHER_PLUS-д харагдана ---- */}
      {showGuardians && (
        <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
          <h2 className="mb-3 font-bold text-brand-soft">Эцэг эхийн мэдээлэл</h2>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {editing && f ? (
              <>
                <Field
                  id="f-fatherPhone"
                  label="Аавын утас"
                  value={null}
                  edit
                  input={
                    <input
                      id="f-fatherPhone"
                      value={f.fatherPhone}
                      onChange={(e) => setForm({ ...f, fatherPhone: e.target.value })}
                      placeholder="88881234"
                      className={inputCls}
                    />
                  }
                />
                <Field
                  id="f-motherPhone"
                  label="Ээжийн утас"
                  value={null}
                  edit
                  input={
                    <input
                      id="f-motherPhone"
                      value={f.motherPhone}
                      onChange={(e) => setForm({ ...f, motherPhone: e.target.value })}
                      placeholder="88881234"
                      className={inputCls}
                    />
                  }
                />
                <Field
                  id="f-guardianNote"
                  label="Тэмдэглэл"
                  value={null}
                  edit
                  input={
                    <input
                      id="f-guardianNote"
                      value={f.guardianNote}
                      onChange={(e) => setForm({ ...f, guardianNote: e.target.value })}
                      className={inputCls}
                    />
                  }
                />
              </>
            ) : (
              <>
                <Field
                  id="v-fatherPhone"
                  label="Аавын утас"
                  value={p?.fatherPhone}
                  edit={false}
                  input={null}
                />
                <Field
                  id="v-motherPhone"
                  label="Ээжийн утас"
                  value={p?.motherPhone}
                  edit={false}
                  input={null}
                />
                <Field
                  id="v-guardianNote"
                  label="Тэмдэглэл"
                  value={p?.guardianNote}
                  edit={false}
                  input={null}
                />
              </>
            )}
          </div>
        </section>
      )}

      {/* ---- Төлбөр ---- */}
      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-3 font-bold text-brand-soft">Сургалтын төлбөр</h2>

        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {editing && f ? (
            <>
              <Field
                id="f-tuitionPlan"
                label="Төлбөрийн багц"
                value={null}
                edit
                input={
                  <select
                    id="f-tuitionPlan"
                    value={f.tuitionPlan}
                    onChange={(e) => setForm({ ...f, tuitionPlan: e.target.value })}
                    className={`bg-bg ${inputCls}`}
                  >
                    <option value="">—</option>
                    {(Object.keys(TUITION_PLAN_LABEL) as TuitionPlanValue[]).map((k) => (
                      <option key={k} value={k}>
                        {TUITION_PLAN_LABEL[k]}
                      </option>
                    ))}
                  </select>
                }
              />
              <Field
                id="f-tuitionAmount"
                label="Дүн (₮)"
                value={null}
                edit
                input={
                  <input
                    id="f-tuitionAmount"
                    type="number"
                    min={0}
                    value={f.tuitionAmount}
                    onChange={(e) => setForm({ ...f, tuitionAmount: e.target.value })}
                    className={inputCls}
                  />
                }
              />
              <Field
                id="f-tuitionNote"
                label="Тайлбар"
                value={null}
                edit
                input={
                  <input
                    id="f-tuitionNote"
                    value={f.tuitionNote}
                    onChange={(e) => setForm({ ...f, tuitionNote: e.target.value })}
                    className={inputCls}
                  />
                }
              />
            </>
          ) : (
            <>
              <Field
                id="v-tuitionPlan"
                label="Төлбөрийн багц"
                value={p?.tuitionPlan ? TUITION_PLAN_LABEL[p.tuitionPlan] : null}
                edit={false}
                input={null}
              />
              <Field
                id="v-tuitionAmount"
                label="Дүн"
                value={p?.tuitionAmount != null ? money(p.tuitionAmount) : null}
                edit={false}
                input={null}
              />
              <Field
                id="v-tuitionNote"
                label="Тайлбар"
                value={p?.tuitionNote}
                edit={false}
                input={null}
              />
            </>
          )}
        </div>

        {!canSeeMoney ? (
          <p className="mt-4 rounded-lg border border-line bg-ink/[0.03] px-3 py-2 text-sm text-ink-dim">
            Төлбөрийн түүх, үлдэгдэл зөвхөн Багш+/Админ эрхтэй хэрэглэгчид харагдана.
          </p>
        ) : paymentsError ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-error">
            <TriangleAlert className="h-4 w-4" aria-hidden />
            {paymentsError}
          </p>
        ) : payments ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs text-ink-dim">Төлөх ёстой</p>
                <p className="text-lg font-bold text-ink">{money(payments.summary.expected)}</p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs text-ink-dim">Төлсөн</p>
                <p className="text-lg font-bold text-success">
                  {money(payments.summary.totalPaid)}
                </p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs text-ink-dim">Үлдэгдэл</p>
                <p
                  className={`text-lg font-bold ${
                    payments.summary.outstanding > 0 ? "text-error" : "text-success"
                  }`}
                >
                  {money(payments.summary.outstanding)}
                </p>
              </div>
            </div>

            {payments.payments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-ink-dim">Сүүлийн төлбөрүүд</p>
                {payments.payments.slice(0, 8).map((pay) => {
                  const st = STATUS_LABEL[pay.status] ?? STATUS_LABEL.PENDING;
                  return (
                    <div
                      key={pay.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
                    >
                      <span>
                        {money(pay.amount)} ·{" "}
                        <span className="text-ink-dim">
                          {METHOD_LABEL[pay.method] ?? pay.method}
                          {pay.forMonth ? ` · ${pay.forMonth}` : ""}
                        </span>
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] ${st.cls}`}>
                        {st.icon && <st.icon className="h-3 w-3" aria-hidden />}
                        {st.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </section>

      {/* ---- Тэмдэглэл ---- */}
      <StudentNotesPanel
        studentId={studentId}
        paymentNotesBlocked={paymentNotesBlocked}
        paymentNotesBlockedReason="Жилийн төлбөрөө бүтэн төлсөн — төлбөрийн тэмдэглэл шаардлагагүй"
      />

      {/* ---- Идэвх ---- */}
      <ActivityHeatmap studentId={studentId} />
    </div>
  );
}
