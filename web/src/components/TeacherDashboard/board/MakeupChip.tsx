import { CircleCheck, CircleDashed, CircleMinus, CircleDot } from "lucide-react";
import { cn } from "@/lib/cn";
import { MAKEUP_LABEL, type MakeupStatus } from "./lib";

const META: Record<MakeupStatus, { icon: typeof CircleCheck; cls: string }> = {
  PENDING: { icon: CircleDashed, cls: "border-warning/40 bg-warning/10 text-warning" },
  PARTIAL: { icon: CircleDot, cls: "border-info/40 bg-info/10 text-info" },
  DONE: { icon: CircleCheck, cls: "border-success/40 bg-success/10 text-success" },
  WAIVED: { icon: CircleMinus, cls: "border-line bg-ink/[0.04] text-ink-dim" },
};

/** Нөхөх хичээлийн төлөв (D7) — тасалсан/чөлөөтэй/хоцорсон сурагчид, өнгөрсөн өдөр */
export default function MakeupChip({ status, className = "" }: { status: MakeupStatus; className?: string }) {
  const m = META[status];
  const Icon = m.icon;
  return (
    <span
      title={`Нөхөх хичээл: ${MAKEUP_LABEL[status]}`}
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-px text-[11px] font-semibold leading-4", m.cls, className)}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="sr-only">Нөхөх хичээл: </span>
      {MAKEUP_LABEL[status]}
    </span>
  );
}
