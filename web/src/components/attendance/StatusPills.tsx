"use client";

/**
 * Ирцийн 4 төлөв: Ирсэн / Хоцорсон / Тасалсан / Чөлөөтэй.
 * `AttendanceStatus.EXCUSED` нь Prisma enum-д аль хэдийн байсан ч UI дээр
 * хэзээ ч харагдаж байгаагүй тул энд 4 дэх сонголт болгож нэмэв.
 * Өнгө дангаараа утга илэрхийлэхгүй байхын тулд icon-той хамт харуулна.
 */
export interface AttendanceOption {
  value: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
  label: string;
  icon: string;
  selectedClass: string;
}

export const ATTENDANCE_OPTIONS: readonly AttendanceOption[] = [
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
  {
    value: "EXCUSED",
    label: "Чөлөөтэй",
    icon: "◇",
    selectedClass: "bg-info/25 text-info",
  },
] as const;

interface StatusPillsProps {
  /** Дэлгэрэнгүй унших техник (screen reader) хэрэглэгчдэд зориулсан нэр */
  studentLabel: string;
  value: string | null | undefined;
  onChange: (status: string) => void;
}

export function StatusPills({ studentLabel, value, onChange }: StatusPillsProps) {
  return (
    <div
      role="group"
      aria-label={`${studentLabel} — ирцийн төлөв`}
      className="flex flex-wrap gap-1.5"
    >
      {ATTENDANCE_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isSelected}
            className={`inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg px-3 text-xs font-medium transition ${
              isSelected ? opt.selectedClass : "bg-ink/5 text-ink-dim"
            }`}
          >
            {isSelected && <span aria-hidden>{opt.icon} </span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
