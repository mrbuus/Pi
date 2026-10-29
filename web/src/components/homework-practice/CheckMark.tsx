import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CheckResult } from "./types";

/** «Шалгах»-ын дүн — дүрс + бичвэр (зөвхөн өнгөөр биш). Зөв хариуг ХЭЗЭЭ Ч хэлэхгүй */
export const CHECK_META: Record<CheckResult, { label: string; icon: typeof CircleCheck; cls: string }> = {
  CORRECT: { label: "Зөв", icon: CircleCheck, cls: "border-success/40 bg-success/10 text-success" },
  WRONG: { label: "Буруу", icon: CircleX, cls: "border-error/40 bg-error/10 text-error" },
  BLANK: { label: "Хариулаагүй", icon: CircleDashed, cls: "border-line bg-ink/5 text-ink-dim" },
};

export default function CheckMark({ result, className }: { result: CheckResult; className?: string }) {
  const m = CHECK_META[result];
  const Icon = m.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-bold", m.cls, className)}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {m.label}
    </span>
  );
}
