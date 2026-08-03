"use client";

import { Check, Circle, X, type LucideIcon } from "lucide-react";

// Гэрийн даалгаврын өдрийн тэмдэг: 4 төлөв (эзний тодорхойлсон яг өнгөнүүд).
// "Тэмдэглээгүй" нь өгөгдмөл, ямар ч товч дараагүй цагаан/хоосон төлөв —
// сонгосон товчоо дахин дарвал (toggle) тэмдгийг арилгаж буцаана.
export type HomeworkMark = "DONE" | "PARTIAL" | "NOT_DONE";

export interface HomeworkMarkOption {
  value: HomeworkMark;
  label: string;
  icon: LucideIcon;
  selectedClass: string;
}

export const HOMEWORK_MARK_OPTIONS: readonly HomeworkMarkOption[] = [
  {
    value: "DONE",
    label: "Хийсэн",
    icon: Check,
    selectedClass: "bg-success text-on-success",
  },
  {
    value: "PARTIAL",
    label: "Дутуу",
    icon: Circle,
    selectedClass: "bg-warning text-on-warning",
  },
  {
    value: "NOT_DONE",
    label: "Хийгээгүй",
    icon: X,
    selectedClass: "bg-error text-on-error",
  },
] as const;

interface HomeworkMarkPillsProps {
  studentLabel: string;
  value: HomeworkMark | null;
  disabled?: boolean;
  onChange: (status: HomeworkMark | null) => void;
}

/**
 * Нэг товшилтоор тэмдэглэдэг гэрийн даалгаврын өнгөт товчнууд. Сонгосон
 * төлөвөө дахин дарвал "тэмдэглээгүй" (цагаан/хоосон) рүү буцна.
 */
export default function HomeworkMarkPills({
  studentLabel,
  value,
  disabled,
  onChange,
}: HomeworkMarkPillsProps) {
  return (
    <div
      role="group"
      aria-label={`${studentLabel} — даалгаврын тэмдэг`}
      className="flex flex-wrap gap-1.5"
    >
      {HOMEWORK_MARK_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(isSelected ? null : opt.value)}
            aria-pressed={isSelected}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-xs font-bold transition disabled:opacity-50 ${
              isSelected
                ? `border-transparent ${opt.selectedClass}`
                : "border-line bg-ink/5 text-ink-dim hover:bg-ink/10"
            }`}
          >
            <Icon className="h-4 w-4 mr-1" aria-hidden />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
