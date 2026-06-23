"use client";

import { useState } from "react";

interface Assignment {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

interface SubmissionRow {
  student: { id: string; firstName: string; lastName: string };
  state: string;
  note: string | null;
}

interface AssignmentsSectionProps {
  assignments: Assignment[];
  submissions: SubmissionRow[];
  openAssignmentId: string;
  newTitle: string;
  onNewTitleChange: (title: string) => void;
  onCreate: () => void;
  onOpen: (assignmentId: string) => void;
  onReview: (studentId: string, action: string) => void;
}

/**
 * Даалгавартай холбоотой үйлдлүүд (үүсгэх, нээх, шалгах).
 * Багш даалгавар өгж, оюутны илгээлтийг шалгана.
 */
export default function AssignmentsSection({
  assignments,
  submissions,
  openAssignmentId,
  newTitle,
  onNewTitleChange,
  onCreate,
  onOpen,
  onReview,
}: AssignmentsSectionProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    await onCreate();
    setIsCreating(false);
  };

  return (
    <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-4 md:p-6">
      <h2 className="mb-4 font-bold text-brand-soft">Даалгаврууд</h2>

      {/* Create New Assignment */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:gap-2">
        <input
          value={newTitle}
          onChange={(e) => onNewTitleChange(e.target.value)}
          placeholder="Шинэ даалгаврын нэр…"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
          disabled={isCreating}
        />
        <button
          onClick={handleCreate}
          disabled={isCreating || !newTitle.trim()}
          className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold transition disabled:opacity-50 md:whitespace-nowrap"
        >
          {isCreating ? "Үүсгэж байна..." : "Өгөх"}
        </button>
      </div>

      {/* Assignments List */}
      <div className="space-y-2">
        {assignments.length === 0 ? (
          <p className="text-sm text-ink-dim">Даалгавар байхгүй</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-lg border border-white/8">
              {/* Assignment Header Button */}
              <button
                onClick={() => onOpen(assignment.id)}
                className="flex w-full flex-col justify-between gap-2 px-4 py-3 text-left md:flex-row md:items-center md:gap-4 md:py-2.5"
              >
                <span className="font-medium text-sm">{assignment.title}</span>
                <span className="text-xs text-ink-dim md:whitespace-nowrap">
                  {assignment.createdAt.slice(0, 10)} →
                </span>
              </button>

              {/* Submissions (Only shown when expanded) */}
              {openAssignmentId === assignment.id && (
                <div className="space-y-2 border-t border-white/8 p-4">
                  {submissions.length === 0 ? (
                    <p className="text-sm text-ink-dim">Илгээлт байхгүй</p>
                  ) : (
                    submissions.map((submission) => (
                      <div
                        key={submission.student.id}
                        className="flex flex-col gap-3 rounded-lg border border-white/8 px-3 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-4 md:py-2"
                      >
                        {/* Student Info */}
                        <div className="text-sm">
                          <p className="font-medium">
                            {submission.student.firstName}{" "}
                            {submission.student.lastName}
                          </p>
                          <p className="text-xs text-ink-dim">
                            {submission.state}
                            {submission.note && ` · ${submission.note}`}
                          </p>
                        </div>

                        {/* Review Buttons */}
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() =>
                              onReview(submission.student.id, "APPROVE")
                            }
                            className="rounded bg-teal-400/20 px-2.5 py-1.5 text-xs font-bold text-teal-200 transition hover:bg-teal-400/30"
                          >
                            Батлах
                          </button>
                          <button
                            onClick={() =>
                              onReview(submission.student.id, "RETURN")
                            }
                            className="rounded bg-red-400/20 px-2.5 py-1.5 text-xs font-bold text-red-200 transition hover:bg-red-400/30"
                          >
                            Буцаах
                          </button>
                          <button
                            onClick={() =>
                              onReview(submission.student.id, "MARK_IN_CLASS")
                            }
                            className="rounded bg-brand-bright/20 px-2.5 py-1.5 text-xs font-bold text-brand-soft transition hover:bg-brand-bright/30"
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
          ))
        )}
      </div>
    </section>
  );
}
