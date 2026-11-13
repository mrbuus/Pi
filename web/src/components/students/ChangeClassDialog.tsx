"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import ExamDialog from "@/components/exams/ExamDialog";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import { classTrack } from "@/lib/classTrack";

interface Classroom {
  id: string;
  name: string;
  subject?: string | null;
  _count?: { enrollments: number };
}

/**
 * Сурагчийн анги солих (Багш+/Админ) — POST /classrooms/:id/enroll: ижил чиглэлийн өмнөх
 * ангийн бүртгэл хаагдаж шинэ нь нээгдэнэ (түүх хадгалагдана, хуучин ангийн дүн устахгүй).
 * Өөр чиглэлийн анги (математик ↔ Нийгэм) сонговол одоогийн анги ХЭВЭЭР, шинэ ангид
 * НЭМЖ бүртгэнэ — сурагч хоёр ангид зэрэг сууна (эзэн 2026-11-12).
 */
export default function ChangeClassDialog({
  studentId,
  studentName,
  currentClassId,
  otherClassIds = [],
  onClose,
  onChanged,
}: {
  studentId: string;
  studentName: string;
  currentClassId: string | null;
  /** Зэрэг сууж буй бусад анги — жагсаалтаас хасна */
  otherClassIds?: string[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Classroom[]>("/classrooms")
      .then((rows) => alive && setClasses([...rows].sort((a, b) => a.name.localeCompare(b.name, "mn"))))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Ангиудыг ачаалж чадсангүй"));
    return () => {
      alive = false;
    };
  }, []);

  const current = classes.find((c) => c.id === currentClassId) ?? null;
  const picked = classes.find((c) => c.id === target) ?? null;
  // Өөр чиглэлийн анги → одоогийн анги хэвээр, нэмж бүртгэнэ
  const adding = !!current && !!picked && classTrack(current) !== classTrack(picked);

  async function save() {
    if (!target) return;
    setSaving(true);
    try {
      await api(`/classrooms/${encodeURIComponent(target)}/enroll`, { method: "POST", body: { studentId } });
      toast.success(
        adding
          ? `${studentName} — ${picked?.name ?? "шинэ"} ангид нэмэгдлээ`
          : `${studentName} — ${picked?.name ?? "шинэ"} анги руу шилжлээ`,
      );
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Анги сольж чадсангүй");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ExamDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Анги солих"
      description={
        adding
          ? `${current?.name ?? "Одоогийн"} ангидаа хэвээр сууна — ${picked?.name ?? ""} ангид нэмж бүртгэнэ`
          : "Хуучин ангийн дүн, ирц түүхэнд үлдэнэ"
      }
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Болих
          </Button>
          <Button type="button" disabled={!target || saving} onClick={() => void save()}>
            {adding ? (saving ? "Нэмж байна" : "Нэмэх") : saving ? "Шилжүүлж байна" : "Шилжүүлэх"}
          </Button>
        </>
      }
    >
      <label className="block text-sm text-ink-dim">
        <span className="mb-1 block">Шинэ анги</span>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink focus:border-brand"
        >
          <option value="">Анги сонгоно уу</option>
          {classes
            .filter((c) => c.id !== currentClassId && !otherClassIds.includes(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c._count ? ` (${c._count.enrollments} сурагч)` : ""}
              </option>
            ))}
        </select>
      </label>
    </ExamDialog>
  );
}
