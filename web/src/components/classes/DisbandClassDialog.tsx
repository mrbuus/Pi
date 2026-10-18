"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import ExamDialog from "@/components/exams/ExamDialog";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";

/**
 * Аюулын бүс: «Анги тараах» (Багш+/Админ) — POST /classrooms/:id/disband.
 * Идэвхтэй бүх сурагчийн бичилт хаагдана (түүх хэвээр), сурагчид ангигүй болно.
 * Ангийн нэрийг яг бичсэний дараа л товч нээгдэнэ.
 */
export default function DisbandClassDialog({
  classroom,
  students,
  onClose,
  onDone,
}: {
  classroom: { id: string; name: string };
  students: number;
  onClose: () => void;
  onDone: (affected: number) => void;
}) {
  const [typed, setTyped] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const match = typed.trim() === classroom.name;

  async function submit() {
    if (!match || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await api<{ affectedStudentCount: number }>(`/classrooms/${encodeURIComponent(classroom.id)}/disband`, {
        method: "POST",
        body: {},
      });
      toast.success(`«${classroom.name}» тарагдлаа, ${res.affectedStudentCount} сурагч ангигүй боллоо`);
      onDone(res.affectedStudentCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Анги тарааж чадсангүй");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ExamDialog
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title="Анги тараах"
      description={classroom.name}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
            Болих
          </Button>
          <Button variant="danger" type="button" disabled={!match || saving} onClick={() => void submit()}>
            {saving ? "Тараж байна" : "Ангийг тараах"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-ink">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden />
          <span>
            Ангийн {students} сурагч ангиас гарч, «ангид хуваарилагдаагүй» болно. Ирц, даалгавар, дүнгийн түүх хадгалагдана
          </span>
        </p>
        <label className="block text-sm text-ink-dim">
          <span className="mb-1 block">Баталгаажуулахын тулд ангийн нэрийг бичнэ үү</span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoFocus
            placeholder={classroom.name}
            className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink outline-none focus:border-error"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </ExamDialog>
  );
}
