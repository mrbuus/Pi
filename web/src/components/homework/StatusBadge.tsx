/* ============================================================================
 * Гэрийн даалгаврын төлөвийн шошго — ICON + ТЕКСТ, өнгө дангаараа биш.
 *
 * SubmissionState enum-ийн 5 утга (api/prisma/schema.prisma):
 *   NOT_DONE → SUBMITTED → (DONE_ONLINE | DONE_IN_CLASS | RETURNED)
 * Эдгээрийг шууд ашиглана — шинэ enum утга зохиомжлохгүй.
 * ========================================================================== */

import { Check, CheckCheck, Circle, Hourglass, Undo2, type LucideIcon } from "lucide-react";

export type SubmissionState =
  | "NOT_DONE"
  | "SUBMITTED"
  | "DONE_ONLINE"
  | "DONE_IN_CLASS"
  | "RETURNED";

interface StatusMeta {
  icon: LucideIcon;
  label: string;
  cls: string;
}

export const STATUS_META: Record<SubmissionState, StatusMeta> = {
  NOT_DONE: {
    icon: Circle,
    label: "Хийгээгүй",
    cls: "border-line bg-panel text-ink-dim",
  },
  SUBMITTED: {
    icon: Hourglass,
    label: "Илгээсэн — шалгуулж байна",
    cls: "border-warning/30 bg-warning/10 text-warning",
  },
  DONE_ONLINE: {
    icon: Check,
    label: "Хийсэн — баталгаажсан",
    cls: "border-success/30 bg-success/10 text-success",
  },
  DONE_IN_CLASS: {
    icon: CheckCheck,
    label: "Ангид шалгуулсан",
    cls: "border-success/30 bg-success/10 text-success",
  },
  RETURNED: {
    icon: Undo2,
    label: "Буцаагдсан — дахин илгээ",
    cls: "border-error/30 bg-error/10 text-error",
  },
};

export function StatusBadge({ state }: { state: string }) {
  const meta = STATUS_META[state as SubmissionState] ?? STATUS_META.NOT_DONE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold ${meta.cls}`}
    >
      <meta.icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}
