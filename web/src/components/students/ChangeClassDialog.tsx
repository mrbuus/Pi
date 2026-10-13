"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import ExamDialog from "@/components/exams/ExamDialog";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";

interface Classroom {
  id: string;
  name: string;
  _count?: { enrollments: number };
}

/**
 * Сурагчийн анги солих (Багш+/Админ) — POST /classrooms/:id/enroll: өмнөх ангийн
 * бүртгэл хаагдаж шинэ нь нээгдэнэ (түүх хадгалагдана, хуучин ангийн дүн устахгүй).
 */
export default function ChangeClassDialog({
  studentId,
  studentName,
  currentClassId,
  onClose,
  onChanged,
}: {
  studentId: string;
  studentName: string;
  currentClassId: string | null;
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

  async function save() {
    if (!target) return;
    setSaving(true);
    try {
      await api(`/classrooms/${encodeURIComponent(target)}/enroll`, { method: "POST", body: { studentId } });
      toast.success(`${studentName} — ${classes.find((c) => c.id === target)?.name ?? "шинэ"} анги руу шилжлээ`);
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
      description="Хуучин ангийн дүн, ирц түүхэнд үлдэнэ."
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Болих
          </Button>
          <Button type="button" disabled={!target || saving} onClick={() => void save()}>
            {saving ? "Шилжүүлж байна" : "Шилжүүлэх"}
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
            .filter((c) => c.id !== currentClassId)
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
