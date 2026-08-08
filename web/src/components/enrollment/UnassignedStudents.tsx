"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";

interface StudentItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  studentProfile: { grade: number | null; school: string | null } | null;
  waitingSince: string;
}

const BATCH_SIZE = 5;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

export default function UnassignedStudents() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<StudentItem[]>("/classrooms/unassigned-students")
      .then(setStudents)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const visibleStudents = expanded ? students : students.slice(0, BATCH_SIZE);
  const hiddenCount = students.length - BATCH_SIZE;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-brand-soft">Ангид ороогүй сурагчид</h2>
          <p className="text-xs text-ink-dim">{students.length} сурагч</p>
        </div>
      </div>

      {loading && <LoadingState rows={3} label="Ачаалж байна" />}

      {error && (
        <ErrorState
          message={error}
          onRetry={load}
        />
      )}

      {!loading && !error && students.length === 0 && (
        <EmptyState title="Ангид ороогүй сурагч алга байна" />
      )}

      {!loading && !error && students.length > 0 && (
        <>
          <div className="space-y-2">
            {visibleStudents.map((student) => {
              const waitSince = new Date(student.waitingSince);
              const now = new Date();
              const daysDiff = Math.floor((now.getTime() - waitSince.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {student.firstName} {student.lastName}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-dim">
                      <Meta
                        items={[
                          student.phone,
                          student.studentProfile?.grade ? `${student.studentProfile.grade}-р анги` : "",
                          `${daysDiff} өдөр хүлээж байна`,
                        ].filter(Boolean)}
                      />
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {!expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-3 text-sm font-semibold text-brand transition hover:bg-brand-bright/5"
            >
              Бүгдийг харах ({hiddenCount + BATCH_SIZE})
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
