"use client";

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Check, Pencil, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { formatMnDate } from "@/lib/dateMn";
import { api } from "@/lib/api";
import SendPasswordResetButton from "../SendPasswordResetButton";
import { SMS_ENABLED } from "@/lib/features";
import {
  StudentDetailData,
  StudentProfileLite,
  TUITION_PLAN_LABEL,
  TuitionPlanValue,
  errMsg,
  fullName,
  isoDateInput,
  money,
} from "../types";

/**
 * «Мэдээлэл» таб — сурагчийн бүртгэлийг харах/засах (PATCH /users/:id/profile).
 * Өмнө нь /app/admin/students/:id (StudentDetail.tsx) дээр байсан маягт; одоо
 * сурагчийн нэгдсэн хуудсанд. Засах эрх: Багш+/Админ (backend-ийн дүрэм).
 */

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
  joinedOn: string;
  leftOn: string;
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
    joinedOn: isoDateInput(p?.joinedOn),
    leftOn: isoDateInput(p?.leftOn),
  };
}

// Зөвхөн ӨӨРЧЛӨГДСӨН, хүчинтэй талбаруудыг PATCH-д явуулна (UpdateUserProfileDto
// бүгд optional). Утас/имэйл/огноог хоосолж «цэвэрлэх» боломжгүй — зөвхөн солих.
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

  if (form.tuitionPlan && form.tuitionPlan !== (p?.tuitionPlan ?? "")) body.tuitionPlan = form.tuitionPlan;
  const amountNum = form.tuitionAmount !== "" ? parseInt(form.tuitionAmount, 10) : undefined;
  if (amountNum !== undefined && !Number.isNaN(amountNum) && amountNum !== p?.tuitionAmount) {
    body.tuitionAmount = amountNum;
  }
  const tuitionNote = form.tuitionNote.trim();
  if (tuitionNote !== (p?.tuitionNote ?? "")) body.tuitionNote = tuitionNote;

  if (form.joinedOn && form.joinedOn !== isoDateInput(p?.joinedOn)) body.joinedOn = form.joinedOn;
  if (form.leftOn && form.leftOn !== isoDateInput(p?.leftOn)) body.leftOn = form.leftOn;

  return body;
}

const inputCls =
  "min-h-11 w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus-visible:border-brand";

function Field({ id, label, value, input }: { id: string; label: string; value?: ReactNode; input?: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-xs text-ink-dim">
        {label}
      </label>
      {input ?? (
        <p id={id} className="break-words font-medium text-ink">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

export default function StudentInfoTab({
  studentId,
  detail,
  setDetail,
  reload,
  canEdit,
  showGuardians,
  canSeeMoney,
}: {
  studentId: string;
  detail: StudentDetailData;
  setDetail: Dispatch<SetStateAction<StudentDetailData | undefined>>;
  reload: () => void;
  canEdit: boolean;
  showGuardians: boolean;
  canSeeMoney: boolean;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const editing = form !== null;
  const f = form;
  const p = detail.studentProfile;

  function input(key: keyof FormState, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    if (!f) return null;
    return (
      <input
        id={`f-${key}`}
        value={f[key]}
        onChange={(e) => setForm({ ...f, [key]: e.target.value })}
        className={inputCls}
        {...extra}
      />
    );
  }

  async function save() {
    if (!form) return;
    const body = buildPatchBody(form, detail, showGuardians);
    if (Object.keys(body).length === 0) {
      setForm(null);
      return;
    }
    const prev = detail;
    setSaving(true);
    setMsg(null);
    // Оптимист: дэлгэцэнд шууд тусгаад, амжилтгүй бол буцаана
    setDetail((cur) => {
      if (!cur) return cur;
      const { firstName, lastName, phone, email, ...profile } = body;
      return {
        ...cur,
        ...(firstName !== undefined ? { firstName: firstName as string } : {}),
        ...(lastName !== undefined ? { lastName: lastName as string } : {}),
        ...(phone !== undefined ? { phone: phone as string } : {}),
        ...(email !== undefined ? { email: email as string } : {}),
        studentProfile: cur.studentProfile
          ? { ...cur.studentProfile, ...(profile as Partial<StudentProfileLite>) }
          : cur.studentProfile,
      };
    });
    try {
      await api(`/users/${studentId}/profile`, { method: "PATCH", body });
      setMsg({ kind: "success", text: "Хадгалагдлаа" });
      setForm(null);
      reload(); // серверийн бодит утгаар баталгаажуулна
    } catch (e) {
      setDetail(prev);
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="chunky p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-brand-soft">Хувийн мэдээлэл</h2>
          {canEdit && !editing && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setForm(formFromDetail(detail));
                  setMsg(null);
                }}
              >
                <Pencil aria-hidden /> Мэдээлэл засах
              </Button>
              {/* Нууц үгээ мартсан сурагчийг багш газар дээр нь шийднэ — код зөвхөн сурагчийн утас руу */}
              {SMS_ENABLED && <SendPasswordResetButton studentId={studentId} studentName={fullName(detail)} />}
            </div>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setForm(null)}>
                Болих
              </Button>
              <Button size="sm" className="min-h-11" onClick={save} disabled={saving}>
                {saving ? "Хадгалж байна…" : "Хадгалах"}
              </Button>
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
            {msg.kind === "error" ? <TriangleAlert className="h-4 w-4" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            {msg.text}
          </p>
        )}

        <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {editing && f ? (
            <>
              <Field id="f-lastName" label="Овог" input={input("lastName", { placeholder: "Овог" })} />
              <Field id="f-firstName" label="Нэр" input={input("firstName", { placeholder: "Нэр" })} />
              <Field id="f-phone" label="Утас" input={input("phone", { placeholder: "88881234", inputMode: "tel" })} />
              <Field id="f-email" label="Имэйл" input={input("email", { placeholder: "name@gmail.com", type: "email" })} />
              <Field id="f-school" label="Сургууль" input={input("school")} />
              <Field
                id="f-grade"
                label="Анги (жил)"
                input={
                  <select
                    id="f-grade"
                    value={f.grade}
                    onChange={(e) => setForm({ ...f, grade: e.target.value })}
                    className={inputCls}
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
              <Field id="f-section" label="Секц" input={input("section", { placeholder: "ж: 12-2" })} />
              <Field id="f-branch" label="Салбар" input={input("branch", { placeholder: "ж: Баруун 4" })} />
              <Field id="f-joinedOn" label="Элссэн огноо" input={input("joinedOn", { type: "date" })} />
              <Field id="f-leftOn" label="Гарсан огноо" input={input("leftOn", { type: "date" })} />
            </>
          ) : (
            <>
              <Field id="v-phone" label="Утас" value={detail.phone} />
              <Field id="v-email" label="Имэйл" value={detail.email} />
              <Field id="v-school" label="Сургууль" value={p?.school} />
              <Field
                id="v-classroom"
                label="Анги"
                value={detail.currentClassroom?.name ?? (p?.grade ? `${p.grade}-р анги` : null)}
              />
              <Field id="v-grade" label="Анги (жил)" value={p?.grade ? `${p.grade}-р анги` : null} />
              <Field id="v-section" label="Секц" value={p?.section} />
              <Field id="v-branch" label="Салбар" value={p?.branch} />
              <Field id="v-joinedOn" label="Элссэн огноо" value={p?.joinedOn ? formatMnDate(p.joinedOn) : null} />
              <Field id="v-leftOn" label="Гарсан огноо" value={p?.leftOn ? formatMnDate(p.leftOn) : null} />
            </>
          )}
        </div>

        <Meta
          className="mt-4 border-t border-line pt-3 text-sm text-ink-dim"
          items={[
            `Даалгавар биелүүлсэн: ${detail.counts.assignmentsCompleted}`,
            `Шалгалтын дүн: ${detail.counts.testResults}`,
            `Ирц бүртгэл: ${detail.counts.attendanceRecords}`,
            `Бодсон бодлого: ${detail.counts.attempts}`,
          ]}
        />
      </section>

      {showGuardians && (
        <section className="chunky p-4 md:p-6">
          <h2 className="mb-3 font-bold text-brand-soft">Эцэг эхийн мэдээлэл</h2>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {editing && f ? (
              <>
                <Field id="f-fatherPhone" label="Аавын утас" input={input("fatherPhone", { placeholder: "88881234", inputMode: "tel" })} />
                <Field id="f-motherPhone" label="Ээжийн утас" input={input("motherPhone", { placeholder: "88881234", inputMode: "tel" })} />
                <Field id="f-guardianNote" label="Тэмдэглэл" input={input("guardianNote")} />
              </>
            ) : (
              <>
                <Field id="v-fatherPhone" label="Аавын утас" value={p?.fatherPhone} />
                <Field id="v-motherPhone" label="Ээжийн утас" value={p?.motherPhone} />
                <Field id="v-guardianNote" label="Тэмдэглэл" value={p?.guardianNote} />
              </>
            )}
          </div>
        </section>
      )}

      {(canSeeMoney || canEdit) && (
        <section className="chunky p-4 md:p-6">
          <h2 className="mb-3 font-bold text-brand-soft">Төлбөрийн багц</h2>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {editing && f ? (
              <>
                <Field
                  id="f-tuitionPlan"
                  label="Төлбөрийн багц"
                  input={
                    <select
                      id="f-tuitionPlan"
                      value={f.tuitionPlan}
                      onChange={(e) => setForm({ ...f, tuitionPlan: e.target.value })}
                      className={inputCls}
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
                <Field id="f-tuitionAmount" label="Дүн (₮)" input={input("tuitionAmount", { type: "number", min: 0, inputMode: "numeric" })} />
                <Field id="f-tuitionNote" label="Тайлбар" input={input("tuitionNote")} />
              </>
            ) : (
              <>
                <Field id="v-tuitionPlan" label="Төлбөрийн багц" value={p?.tuitionPlan ? TUITION_PLAN_LABEL[p.tuitionPlan] : null} />
                <Field id="v-tuitionAmount" label="Дүн" value={p?.tuitionAmount != null ? money(p.tuitionAmount) : null} />
                <Field id="v-tuitionNote" label="Тайлбар" value={p?.tuitionNote} />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
