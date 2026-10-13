"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ExamDialog from "@/components/exams/ExamDialog";
import ProblemStudentPreview from "@/components/ProblemStudentPreview";
import ProblemPicker from "@/components/test-builder/ProblemPicker";
import type { Problem } from "@/components/test-builder/types";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import type { ServerProblem } from "./model";
import type { Chapter } from "./SettingsCard";

/**
 * «Сангаас сонгох» — бүлэг сонгоод бодлогуудыг (дугаар дээр дарж) сонгоно,
 * сонгосон дарааллаар тухайн байрлалд орно. Тестэд аль хэдийн байгаа бодлого
 * жагсаалтад гарахгүй (давхар орохгүй).
 */
export default function BankDialog({
  open,
  onOpenChange,
  subject,
  defaultChapterId,
  excludeIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  defaultChapterId: string;
  excludeIds: Set<string>;
  onAdd: (problems: ServerProblem[]) => void;
}) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState(defaultChapterId);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<Problem | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<Chapter[]>(`/chapters${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`)
      .then((rows) => alive && setChapters(rows))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Бүлгүүдийг ачаалж чадсангүй"));
    return () => {
      alive = false;
    };
  }, [open, subject]);

  useEffect(() => {
    if (!open || !chapterId) return;
    let alive = true;
    void Promise.resolve().then(() => {
      if (!alive) return;
      setLoading(true);
      setError("");
    });
    api<Problem[]>(`/chapters/${encodeURIComponent(chapterId)}/problems?take=100`)
      .then((rows) => alive && setProblems(rows))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Бодлого ачаалж чадсангүй"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, chapterId]);

  const visible = useMemo(() => problems.filter((p) => !excludeIds.has(p.id)), [problems, excludeIds]);

  function close(next: boolean) {
    if (!next) {
      setSelected([]);
      setPreview(null);
    }
    onOpenChange(next);
  }

  return (
    <ExamDialog
      open={open}
      onOpenChange={close}
      wide
      title="Сангаас бодлого нэмэх"
      description="Бодлогыг дугаар дээр нь дарж сонгоно — сонгосон дарааллаар орно."
      footer={
        <>
          <Button variant="outline" type="button" onClick={() => close(false)}>
            Болих
          </Button>
          <Button
            type="button"
            disabled={selected.length === 0}
            onClick={() => {
              const byId = new Map(problems.map((p) => [p.id, p]));
              onAdd(selected.map((id) => byId.get(id)).filter(Boolean) as unknown as ServerProblem[]);
              close(false);
            }}
          >
            {selected.length > 0 ? `${selected.length} бодлого нэмэх` : "Бодлого сонгоно уу"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block text-sm text-ink-dim">
          <span className="mb-1 block">Бүлэг сэдэв</span>
          <select
            value={chapterId}
            onChange={(e) => {
              setChapterId(e.target.value);
              setSelected([]);
              setPreview(null);
            }}
            className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2 text-base text-ink focus:border-brand"
          >
            <option value="">Бүлэг сонгоно уу</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.book?.code ? `${c.book.code} — ` : ""}
                {c.title}
              </option>
            ))}
          </select>
        </label>

        {preview && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setPreview(null)}
              aria-label="Харагдацыг хаах"
              className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-surface/90 text-ink-dim hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <ProblemStudentPreview
              statementText={preview.statementText}
              imageKey={preview.imageKey}
              format={preview.format}
              points={preview.points}
              choices={(preview.choiceOptions ?? []).map((c) => ({ text: c.text, isCorrect: c.isCorrect, imageKey: c.imageKey ?? null }))}
            />
          </div>
        )}

        <ProblemPicker
          problems={visible}
          loading={loading}
          error={error}
          chapterChosen={!!chapterId}
          selectedIds={selected}
          onToggle={(id) =>
            setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
          }
          onPreview={setPreview}
          onSelectFirst={(n) => setSelected(visible.slice(0, n).map((p) => p.id))}
          onClearSelection={() => setSelected([])}
        />
      </div>
    </ExamDialog>
  );
}
