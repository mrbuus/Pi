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
  onMarkChange: (studentId: string, status: string) => void;
  onSave: () => void;
  today: string;
}

// Өнгө дангаараа утга илэрхийлэхгүй байхын тулд icon-той хамт харуулна.
// Ангийн нэрсийг Tailwind статик шинжилгээ хийдэг тул template literal-аар
// динамикаар угсрахгүй — сонголт бүрийн бүрэн className-ийг шууд бичнэ.
const ATTENDANCE_OPTIONS = [
  {
    value: "PRESENT",
    label: "Ирсэн",
    icon: "✓",
    selectedClass: "bg-success/25 text-success",
  },
  {
    value: "LATE",
    label: "Хоцорсон",
    icon: "◐",
    selectedClass: "bg-warning/25 text-warning",
  },
  {
    value: "ABSENT",
    label: "Тасалсан",
    icon: "✕",
    selectedClass: "bg-error/25 text-error",
  },
] as const;

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
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
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
              className="flex flex-col gap-3 rounded-lg border border-line px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4 md:py-2"
            >
              {/* Student Name */}
              <span className="text-sm font-medium">
                {r.student.firstName} {r.student.lastName}
              </span>

              {/* Attendance Buttons */}
              <div className="flex gap-1.5">
                {ATTENDANCE_OPTIONS.map((opt) => {
                  const isSelected = marks[r.student.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onMarkChange(r.student.id, opt.value)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        isSelected ? opt.selectedClass : "bg-ink/5 text-ink-dim"
                      }`}
                    >
                      {isSelected && <span aria-hidden>{opt.icon} </span>}
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
