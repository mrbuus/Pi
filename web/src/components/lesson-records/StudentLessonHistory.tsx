"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useSection } from "@/components/students/progress/useSection";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { formatMinutes } from "@/components/schedule/types";
import { ATTENDANCE_LABEL, type MyLesson } from "./types";

const SHOW = 5;

/** Сурагч: батлагдсан, өөрийн оролцсон хичээлүүд («Хийсэн хичээлүүд»). */
export default function StudentLessonHistory() {
  const { data, status, error, reload } = useSection<MyLesson[]>("/lesson-records/me", []);
  const [all, setAll] = useState(false);

  if (status === "loading") return <LoadingState rows={2} />;
  if (status === "error") return <ErrorState message={error} onRetry={reload} />;
  if (data.length === 0)
    return <p className="rounded-lg border border-line bg-panel px-3 py-3 text-sm text-ink-dim">Одоогоор бүртгэгдсэн хичээл алга.</p>;

  const rows = all ? data : data.slice(0, SHOW);
  return (
    <div>
      <ul className="divide-y divide-line/60 rounded-xl border border-line">
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[3.5rem_1fr] gap-x-3 px-3 py-2.5 text-sm">
            <span className="font-mono text-xs font-bold text-brand-soft">{r.date.slice(5).replace("-", ".")}</span>
            <div className="min-w-0">
              <p className="font-medium">{r.topic ?? <span className="italic text-ink-dim">Сэдэвгүй</span>}</p>
              <p className="mt-0.5 text-xs text-ink-dim">
                <Meta
                  items={[
                    r.classroomName.replace(/\s*\([^)]*\)$/, ""),
                    `${formatMinutes(r.startMinute)}–${formatMinutes(r.endMinute)}`,
                    r.leadTeacherName,
                    r.attendance ? ATTENDANCE_LABEL[r.attendance] ?? null : null,
                  ]}
                />
              </p>
            </div>
          </li>
        ))}
      </ul>
      {data.length > SHOW && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-soft"
        >
          <ChevronDown className={`h-4 w-4 transition ${all ? "rotate-180" : ""}`} aria-hidden />
          {all ? "Хураах" : `Бүгд (${data.length})`}
        </button>
      )}
    </div>
  );
}
