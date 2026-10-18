import type { ReactNode } from "react";
import { HwSentIcon } from "@/components/attendance/marks";
import { cn } from "@/lib/cn";

/** Тайлбарын нэг зүйл (дүрс + бичиг) — жагсаалтын ДООР (эзэн: legend хамгийн доор) */
export function LegendItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      {icon}
      <span>{children}</span>
    </li>
  );
}

export function Legend({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <ul aria-label={label} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-dim", className)}>
      {children}
    </ul>
  );
}

/** Шалгуур хангаагүй сурагчийн улаан цэгийн тайлбарын дүрс (marks.tsx RiskMark-тай ижил) */
export function RiskDot() {
  return <span aria-hidden className="inline-flex size-2.5 rounded-full bg-error ring-2 ring-error/20" />;
}

/** Тухайн хичээлийн даалгаврыг илгээсэн сурагчийн жижиг тэмдэг (нэрийн ард) */
export function SentMark({ className = "" }: { className?: string }) {
  return (
    <span title="Даалгавраа илгээсэн" className={cn("inline-flex shrink-0 text-brand", className)}>
      <HwSentIcon className="size-3.5" aria-hidden />
      <span className="sr-only">Даалгавраа илгээсэн</span>
    </span>
  );
}
