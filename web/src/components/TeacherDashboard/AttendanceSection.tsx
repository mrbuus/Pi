"use client";

import { useState } from "react";

interface StudentAttendance {
  id: string;
  firstName: string;
  lastName: string;
  color?: string;
  note?: string | null;
}

interface RosterRow {
  student: StudentAttendance;
  status: string | null;
}

interface AttendanceSectionProps {
  roster: RosterRow[];
  marks: Record<string, string>;
  colorTags: Record<string, { color: string; note: string | null }>;
  onMarkChange: (studentId: string, status: string) => void;
  onSave: () => void;
  today: string;
  onColorTagUpdate?: () => void;
}

const ATTENDANCE_OPTIONS = [
  { value: "PRESENT", label: "Ирсэн", color: "teal" },
  { value: "LATE", label: "Хоцорсон", color: "amber" },
  { value: "ABSENT", label: "Тасалсан", color: "red" },
];

/**
 * Өнөөдрийн ирцийг заавал нэмнэ.
 * Оюутан бүрийн ирцийн статусыг өөрчлөх, хадгалах үйлдлүүдийг хийнэ.
 */
export default function AttendanceSection({
  roster,
  marks,
  onMarkChange,
  onSave,
  today,
}: AttendanceSectionProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  return (
    <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <h2 className="font-bold text-brand-soft">
          Өнөөдрийн ирц · <span className="text-sm text-ink-dim">{today}</span>
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold transition disabled:opacity-50"
        >
          {isSaving ? "Хадгалаж байна..." : "Хадгалах"}
        </button>
      </div>

      {/* Attendance List */}
      <div className="space-y-2">
        {roster.length === 0 ? (
          <p className="text-sm text-ink-dim">Сурагч байхгүй</p>
        ) : (
          roster.map((r) => (
            <div
              key={r.student.id}
              className="flex flex-col gap-3 rounded-lg border border-white/8 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4 md:py-2"
            >
              {/* Student Name */}
              <span className="text-sm font-medium">
                {r.student.firstName} {r.student.lastName}
              </span>

              {/* Attendance Buttons */}
              <div className="flex gap-1.5">
                {ATTENDANCE_OPTIONS.map((opt) => {
                  const isSelected = marks[r.student.id] === opt.value;
                  const colorMap: Record<string, string> = {
                    teal: isSelected
                      ? "bg-teal-400/25 text-teal-200"
                      : "bg-white/5 text-ink-dim",
                    amber: isSelected
                      ? "bg-amber-400/25 text-amber-200"
                      : "bg-white/5 text-ink-dim",
                    red: isSelected
                      ? "bg-red-400/25 text-red-200"
                      : "bg-white/5 text-ink-dim",
                  };

                  return (
                    <button
                      key={opt.value}
                      onClick={() => onMarkChange(r.student.id, opt.value)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${colorMap[opt.color]}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
