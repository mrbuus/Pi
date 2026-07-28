/* ============================================================================
 * Гэрийн даалгаврын төлөвийн шошго — ICON + ТЕКСТ, өнгө дангаараа биш.
 *
 * SubmissionState enum-ийн 5 утга (api/prisma/schema.prisma):
 *   NOT_DONE → SUBMITTED → (DONE_ONLINE | DONE_IN_CLASS | RETURNED)
 * Эдгээрийг шууд ашиглана — шинэ enum утга зохиомжлохгүй.
 * ========================================================================== */

export type SubmissionState =
  | "NOT_DONE"
  | "SUBMITTED"
  | "DONE_ONLINE"
  | "DONE_IN_CLASS"
  | "RETURNED";

interface StatusMeta {
  icon: string;
  label: string;
  cls: string;
}

export const STATUS_META: Record<SubmissionState, StatusMeta> = {
  NOT_DONE: {
    icon: "○",
    label: "Хийгээгүй",
    cls: "border-line bg-panel text-ink-dim",
  },
  SUBMITTED: {
    icon: "⏳",
    label: "Илгээсэн — шалгуулж байна",
    cls: "border-warning/30 bg-warning/10 text-warning",
  },
  DONE_ONLINE: {
    icon: "✅",
    label: "Хийсэн — баталгаажсан",
    cls: "border-success/30 bg-success/10 text-success",
  },
  DONE_IN_CLASS: {
    icon: "☑",
    label: "Ангид шалгуулсан",
    cls: "border-success/30 bg-success/10 text-success",
  },
  RETURNED: {
    icon: "↩",
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
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}
