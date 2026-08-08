"use client";

import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Meta } from "@/components/ui/Meta";

/* ============================================================================
 * 📦 Тест/даалгавар бүрийг ЖИЖИГ БОКСОД тус тусад нь харуулна (owner-ийн
 * хүсэлт) — багш хэдэн тест өгснөө нэг харцаар харах боломжтой.
 * Дарахад тухайн даалгаврын сурагч бүрийн илгээлт (roster) доор нь нээгдэнэ.
 * ========================================================================== */

interface TestAssignment {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  _count?: { submissions: number };
}

interface SubmissionRow {
  student: { id: string; firstName: string; lastName: string };
  state: string;
  note: string | null;
}

interface TeacherHomeworkTestCardProps {
  assignment: TestAssignment;
  isOpen: boolean;
  submissions: SubmissionRow[];
  onToggle: () => void;
  onReview: (studentId: string, action: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  DAILY: "Өдөр тутмын",
  EXTRA: "Нэмэлт",
};

export default function TeacherHomeworkTestCard({
  assignment,
  isOpen,
  submissions,
  onToggle,
  onReview,
}: TeacherHomeworkTestCardProps) {
  return (
    <div className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full flex-col items-start gap-1 rounded-xl px-3 py-3 text-left transition hover:bg-ink/5"
      >
        <div className="flex w-full items-start justify-between gap-2">
          <span className="min-w-0 flex-1 break-words text-sm font-bold">
            {assignment.title}
          </span>
          <span aria-hidden="true" className="shrink-0 text-ink-dim">
            {isOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-dim">
          <span className="rounded-full border border-line px-2 py-0.5 font-semibold">
            {TYPE_LABEL[assignment.type] ?? assignment.type}
          </span>
          {assignment._count && (
            <span>{assignment._count.submissions} илгээсэн</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="space-y-2 border-t border-line p-3">
          {submissions.length === 0 ? (
            <p className="text-sm text-ink-dim">Илгээлт байхгүй</p>
          ) : (
            submissions.map((submission) => (
              <div
                key={submission.student.id}
                className="flex flex-col gap-2.5 rounded-lg border border-line px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {submission.student.firstName} {submission.student.lastName}
                  </p>
                  <p className="text-xs text-ink-dim">
                    <Meta items={[
                      submission.state,
                      submission.note
                    ]} />
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onReview(submission.student.id, "APPROVE")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded bg-success/20 px-2.5 text-xs font-bold text-success transition hover:bg-success/30"
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    Батлах
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(submission.student.id, "RETURN")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded bg-error/20 px-2.5 text-xs font-bold text-error transition hover:bg-error/30"
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Буцаах
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onReview(submission.student.id, "MARK_IN_CLASS")
                    }
                    className="min-h-9 rounded bg-brand-bright/20 px-2.5 text-xs font-bold text-brand-soft transition hover:bg-brand-bright/30"
                  >
                    Ангид шалгасан
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
