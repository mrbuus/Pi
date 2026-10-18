"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import ExamDialog from "@/components/exams/ExamDialog";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import { errMsg } from "./types";

const FIELD =
  "min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink outline-none focus:border-brand";
const DEFAULT_BRANCHES = ["Баруун 4", "Зүүн 4"];

interface ClassOption {
  id: string;
  name: string;
}
interface TeacherOption {
  id: string;
  displayName: string;
}
export interface CreatedClass {
  id: string;
  name: string;
}

/** «12-13 (Баруун 4)» → «Баруун 4» */
const branchOf = (name: string) => name.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() ?? null;

/**
 * Шинэ анги (Багш+/Админ) — POST /classrooms. Нэр = «секц (салбар)», жишээ нь
 * «12-13 (Баруун 4)». Жил нь секцийн эхний тооноос автоматаар таарна.
 */
export default function NewClassDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (created: CreatedClass) => void;
}) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [section, setSection] = useState("");
  const [branch, setBranch] = useState(DEFAULT_BRANCHES[0]);
  const [grade, setGrade] = useState("");
  const [type, setType] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
  // Хичээл (эзэн 2026-10-18): Нийгмийн ухааны ангийн сурагчид л тэр хичээлийн контентыг харна
  const [subject, setSubject] = useState<"MATH" | "SOCIAL_STUDIES">("MATH");
  const [lead, setLead] = useState("");
  const [assistant, setAssistant] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<ClassOption[]>("/classrooms")
      .then((rows) => alive && setClasses(rows))
      .catch(() => {
        /* давхар нэрийг сервер шалгана */
      });
    api<TeacherOption[]>("/schedule/teachers")
      .then((rows) => alive && setTeachers(rows))
      .catch(() => {
        /* багшгүйгээр ч үүсгэнэ */
      });
    return () => {
      alive = false;
    };
  }, []);

  const branches = useMemo(() => {
    const set = new Set(DEFAULT_BRANCHES);
    for (const c of classes) {
      const b = branchOf(c.name);
      if (b) set.add(b);
    }
    return [...set];
  }, [classes]);

  const cleanSection = section.trim().replace(/\s+/g, " ");
  const name = cleanSection ? (branch ? `${cleanSection} (${branch})` : cleanSection) : "";
  const autoGrade = cleanSection.match(/^(\d{1,2})/)?.[1] ?? "";
  const shownGrade = grade || (autoGrade && Number(autoGrade) >= 1 && Number(autoGrade) <= 13 ? autoGrade : "");
  const duplicate = !!name && classes.some((c) => c.name.toLowerCase() === name.toLowerCase());
  const sameTeacher = !!lead && lead === assistant;
  const ready = !!cleanSection && !duplicate && !sameTeacher;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      const created = await api<CreatedClass>("/classrooms", {
        method: "POST",
        body: {
          name,
          type,
          grade: shownGrade ? Number(shownGrade) : undefined,
          teacherId: lead || undefined,
          assistantTeacherId: assistant || undefined,
          ...(subject !== "MATH" ? { subject } : {}),
        },
      });
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
      onOpenChange={(o) => !o && !saving && onClose()}
      title="Шинэ анги"
      description={name ? `Нэр: ${name}` : "Нэр нь «секц (салбар)» хэлбэрээр үүснэ"}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
            Болих
          </Button>
          <Button type="submit" form="new-class-form" disabled={!ready || saving}>
            {saving ? "Үүсгэж байна" : "Үүсгэх"}
          </Button>
        </>
      }
    >
      <form id="new-class-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Секц" wide>
          <input
            required
            autoFocus
            value={section}
            onChange={(e) => setSection(e.target.value.slice(0, 40))}
            placeholder="Жишээ нь: 12-13"
            autoComplete="off"
            className={FIELD}
          />
        </Field>
        <Field label="Салбар">
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={FIELD}>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            <option value="">Салбаргүй</option>
          </select>
        </Field>
        <Field label="Анги (жил)">
          <select value={shownGrade} onChange={(e) => setGrade(e.target.value)} className={FIELD}>
            <option value="">Тодорхойгүй</option>
            {Array.from({ length: 13 }, (_, i) => 13 - i).map((g) => (
              <option key={g} value={g}>
                {g === 13 ? "13 (төгсөгч)" : `${g}-р анги`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Төрөл">
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={FIELD}>
            <option value="IN_PERSON">Танхим</option>
            <option value="ONLINE">Онлайн</option>
          </select>
        </Field>
        <Field label="Хичээл">
          <select value={subject} onChange={(e) => setSubject(e.target.value as typeof subject)} className={FIELD}>
            <option value="MATH">Математик</option>
            <option value="SOCIAL_STUDIES">Нийгмийн ухаан</option>
          </select>
        </Field>
        <Field label="Ангийн багш">
          <select value={lead} onChange={(e) => setLead(e.target.value)} className={FIELD}>
            <option value="">Дараа онооно</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === assistant}>
                {t.displayName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Туслах багш">
          <select value={assistant} onChange={(e) => setAssistant(e.target.value)} className={FIELD}>
            <option value="">Байхгүй</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === lead}>
                {t.displayName}
              </option>
            ))}
          </select>
        </Field>
        {duplicate && (
          <p role="alert" className="col-span-2 rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            «{name}» нэртэй анги байна
          </p>
        )}
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

export function announceCreated(created: CreatedClass, open: () => void) {
  toast.success(`«${created.name}» анги үүслээ`, { action: { label: "Нээх", onClick: open } });
}
