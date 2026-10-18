"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import ExamDialog from "@/components/exams/ExamDialog";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import { TUITION_PLAN_LABEL, errMsg, type TuitionPlanValue } from "./types";

interface ClassroomOption {
  id: string;
  name: string;
  grade?: number | null;
  _count?: { enrollments: number };
}

interface Created {
  id: string;
  studentCode: string | null;
  firstName: string;
  lastName: string;
}

const PLANS: TuitionPlanValue[] = ["FULL_YEAR", "INSTALLMENT", "MONTHLY"];
const FIELD = "min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink outline-none focus:border-brand";

function todayUB(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date());
}

const digits = (value: string) => value.replace(/\D/g, "").slice(0, 8);

/**
 * Танхимын сурагчийг гараар бүртгэх (Багш+/Админ) — POST /users/students.
 * Нэвтрэх нэр, нууц үг хоёулаа сурагчийн утас (эзний дүрэм). Анги сонговол
 * салбар, секц, анги (жил) нь ангийн нэрээс автоматаар бөглөгдөнө.
 */
export default function NewStudentDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (student: Created) => void;
}) {
  const [classes, setClasses] = useState<ClassroomOption[]>([]);
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    classroomId: "",
    joinedOn: todayUB(),
    school: "",
    grade: "",
    fatherPhone: "",
    motherPhone: "",
    tuitionPlan: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<ClassroomOption[]>("/classrooms")
      .then((rows) => alive && setClasses([...rows].sort((a, b) => a.name.localeCompare(b.name, "mn", { numeric: true }))))
      .catch(() => alive && setError("Ангиудыг ачаалж чадсангүй — ангигүйгээр бүртгэж болно"));
    return () => {
      alive = false;
    };
  }, []);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  function pickClass(id: string) {
    const grade = classes.find((c) => c.id === id)?.grade;
    // 13-x анги нь төгсөгчид — сургуулийн анги 12 хэвээр
    setForm((f) => ({ ...f, classroomId: id, grade: grade ? String(Math.min(grade, 12)) : f.grade }));
  }

  const ready = form.lastName.trim() && form.firstName.trim() && form.phone.length === 8;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      const created = await api<Created>("/users/students", {
        method: "POST",
        body: {
          lastName: form.lastName.trim(),
          firstName: form.firstName.trim(),
          phone: form.phone,
          classroomId: form.classroomId || undefined,
          joinedOn: form.joinedOn || undefined,
          school: form.school.trim() || undefined,
          grade: form.grade ? Number(form.grade) : undefined,
          fatherPhone: form.fatherPhone || undefined,
          motherPhone: form.motherPhone || undefined,
          tuitionPlan: form.tuitionPlan || undefined,
          note: form.note.trim() || undefined,
        },
      });
      toast.success(`${created.lastName} ${created.firstName} бүртгэгдлээ${created.studentCode ? ` — код ${created.studentCode}` : ""}`);
      onCreated(created);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
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
          <Button type="submit" form="new-student-form" disabled={!ready || saving}>
            {saving ? "Бүртгэж байна" : "Бүртгэх"}
          </Button>
        </>
      }
    >
      <form id="new-student-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
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
            value={form.phone}
            onChange={(e) => set("phone")(digits(e.target.value))}
            placeholder="8 оронтой"
            className={`${FIELD} tabular-nums`}
          />
        </Field>
        <Field label="Анги" wide>
          <select value={form.classroomId} onChange={(e) => pickClass(e.target.value)} className={FIELD}>
            <option value="">Дараа хуваарилна</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c._count ? ` — ${c._count.enrollments} сурагч` : ""}
              </option>
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
          <input value={form.school} onChange={(e) => set("school")(e.target.value)} placeholder="Жишээ нь: 1-р сургууль" className={FIELD} />
        </Field>
        <Field label="Аавын утас">
          <input inputMode="numeric" value={form.fatherPhone} onChange={(e) => set("fatherPhone")(digits(e.target.value))} className={`${FIELD} tabular-nums`} />
        </Field>
        <Field label="Ээжийн утас">
          <input inputMode="numeric" value={form.motherPhone} onChange={(e) => set("motherPhone")(digits(e.target.value))} className={`${FIELD} tabular-nums`} />
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
          <textarea
            value={form.note}
            onChange={(e) => set("note")(e.target.value.slice(0, 500))}
            rows={2}
            className={`${FIELD} py-2`}
          />
        </Field>
        {error && (
          <p role="alert" className="col-span-2 rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
      </form>
    </ExamDialog>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block text-sm text-ink-dim ${wide ? "col-span-2" : "col-span-2 sm:col-span-1"}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
