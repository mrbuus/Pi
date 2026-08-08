"use client";

/**
 * Хоцролтын хугацаа сонгогч — зөвхөн "Хоцорсон" (LATE) сонгогдоход
 * харагдана. Ангийн өмнө зогсоод хурдан дарж болохоор жижиг товчлууруудаар
 * хийсэн (compact dropdown биш) — 1 товшилтоор шууд сонгогдоно.
 *
 * Утгууд нь `api/prisma/schema.prisma`-ийн `LateRange` enum-тай ЯГ таарч
 * байх ёстой.
 */
export type LateRangeValue =
  | "FIVE_TO_TEN"
  | "TEN_TO_THIRTY"
  | "THIRTY_TO_SIXTY"
  | "OVER_ONE_HOUR";

export const LATE_RANGE_OPTIONS: readonly {
  value: LateRangeValue;
  label: string;
}[] = [
  { value: "FIVE_TO_TEN", label: "5–10 минут" },
  { value: "TEN_TO_THIRTY", label: "10–30 минут" },
  { value: "THIRTY_TO_SIXTY", label: "30 минут – 1 цаг" },
  { value: "OVER_ONE_HOUR", label: "1 цагаас дээш" },
] as const;

interface LateRangePickerProps {
  studentLabel: string;
  value: LateRangeValue | null | undefined;
  onChange: (value: LateRangeValue) => void;
}

export function LateRangePicker({
  studentLabel,
  value,
  onChange,
}: LateRangePickerProps) {
  return (
    <div
      role="group"
      aria-label={`${studentLabel} — хэдий хугацаагаар хоцорсон`}
      className="flex flex-wrap gap-1.5"
    >
      {LATE_RANGE_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isSelected}
            className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
              isSelected
                ? "border-warning bg-warning/20 text-warning"
                : "border-line bg-ink/5 text-ink-dim"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
