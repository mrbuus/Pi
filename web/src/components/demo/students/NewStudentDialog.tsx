"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import ExamDialog from "@/components/exams/ExamDialog";
import { Button } from "@/components/ui/kit/button";
import { ALL_STUDENTS, CLASSES, TUITION_PLAN_LABEL, toKey, type Branch, type TuitionPlan } from "../world";

const PLANS: TuitionPlan[] = ["FULL_YEAR", "INSTALLMENT", "MONTHLY"];
const BRANCHES: Branch[] = ["Баруун 4", "Зүүн 4"];
const FIELD = "min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink outline-none focus:border-brand";

const digits = (value: string) => value.replace(/\D/g, "").slice(0, 8);

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block text-sm text-ink-dim ${wide ? "col-span-2" : "col-span-2 sm:col-span-1"}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

/**
 * Шинэ сурагч бүртгэх — жинхэнэ аппын components/students/NewStudentDialog-той ИЖИЛ талбарууд.
 * Бодит: POST /users/students. Нэвтрэх нэр, нууц үг хоёулаа сурагчийн утас (эзний дүрэм).
 * Демо: зөвхөн мэдэгдэл гаргана, юу ч хадгалахгүй.
 */
export default function NewStudentDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    classroomId: "",
    joinedOn: toKey(new Date()),
    school: "",
    grade: "",
    fatherPhone: "",
    motherPhone: "",
    tuitionPlan: "",
    note: "",
  });

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  function pickClass(id: string) {
    const n = parseInt(CLASSES.find((c) => c.id === id)?.label ?? "", 10);
    // 13-x анги нь төгсөгчид — сургуулийн анги 12 хэвээр
    setForm((f) => ({ ...f, classroomId: id, grade: Number.isNaN(n) ? f.grade : String(Math.min(n, 12)) }));
  }

  const ready = form.lastName.trim() !== "" && form.firstName.trim() !== "" && form.phone.length === 8;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    const code = String(2027000 + ALL_STUDENTS.length + 1);
    toast.success(`${form.lastName.trim()} ${form.firstName.trim()} бүртгэгдлээ — код ${code}`, {
      description: "Демо: өгөгдөл хадгалагдахгүй",
    });
    onClose();
  }

  return (
    <ExamDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Шинэ сурагч бүртгэх"
      description="Нэвтрэх нэр, нууц үг хоёулаа сурагчийн утасны дугаар"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Болих
          </Button>
          <Button type="submit" form="demo-new-student-form" disabled={!ready}>
            Бүртгэх
          </Button>
        </>
      }
    >
      <form id="demo-new-student-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Овог">
          <input required value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} autoComplete="off" className={FIELD} />
        </Field>
        <Field label="Нэр">
          <input required value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} autoComplete="off" className={FIELD} />
        </Field>
        <Field label="Сурагчийн утас" wide>
          <input
            required
            inputMode="numeric"
            autoComplete="off"
            value={form.phone}
            onChange={(e) => set("phone")(digits(e.target.value))}
            placeholder="8 оронтой"
            className={`${FIELD} tabular-nums`}
          />
        </Field>
        <Field label="Анги" wide>
          <select value={form.classroomId} onChange={(e) => pickClass(e.target.value)} className={FIELD}>
            <option value="">Дараа хуваарилна</option>
            {BRANCHES.map((b) => (
              <optgroup key={b} label={b}>
                {CLASSES.filter((c) => c.branch === b).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} — {c.students.length} сурагч
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Сурч эхэлсэн">
          <input type="date" value={form.joinedOn} onChange={(e) => set("joinedOn")(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Сургуулийн анги">
          <select value={form.grade} onChange={(e) => set("grade")(e.target.value)} className={FIELD}>
            <option value="">—</option>
            {Array.from({ length: 12 }, (_, i) => 12 - i).map((g) => (
              <option key={g} value={g}>
                {g}-р анги
              </option>
            ))}
          </select>
        </Field>
        <Field label="Сургууль" wide>
          <input value={form.school} onChange={(e) => set("school")(e.target.value)} placeholder="Жишээ нь: 1-р сургууль" autoComplete="off" className={FIELD} />
        </Field>
        <Field label="Аавын утас">
          <input inputMode="numeric" autoComplete="off" value={form.fatherPhone} onChange={(e) => set("fatherPhone")(digits(e.target.value))} className={`${FIELD} tabular-nums`} />
        </Field>
        <Field label="Ээжийн утас">
          <input inputMode="numeric" autoComplete="off" value={form.motherPhone} onChange={(e) => set("motherPhone")(digits(e.target.value))} className={`${FIELD} tabular-nums`} />
        </Field>
        <Field label="Төлбөрийн хэлбэр" wide>
          <select value={form.tuitionPlan} onChange={(e) => set("tuitionPlan")(e.target.value)} className={FIELD}>
            <option value="">Дараа тохирно</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {TUITION_PLAN_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Тэмдэглэл" wide>
          <textarea value={form.note} onChange={(e) => set("note")(e.target.value.slice(0, 500))} rows={2} className={`${FIELD} py-2`} />
        </Field>
      </form>
    </ExamDialog>
  );
}
