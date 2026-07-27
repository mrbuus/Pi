// Элсэлтийн цонхны (Enrollment Window) хуваалцсан төрлүүд ба Монгол шошгууд.
// Эх сурвалж: api/prisma/schema.prisma — EnrollmentStatus / SubjectAvailability /
// EnrollmentWindow. Энд БҮХ утга ӨГӨГДӨЛ (сервэрээс) — аль хичээл юу авахыг
// код руу hardcode хийхгүй, зөвхөн шошго/өнгийг тодорхойлно.

export type EnrollmentSubject = "MATH" | "SOCIAL_STUDIES" | "SAT";
export type EnrollmentStatus = "OPEN" | "CLOSED" | "COMING_SOON";
export type SubjectAvailability = "CLASSROOM_ONLY" | "ONLINE_ONLY" | "BOTH";

// GET /enrollment-windows -ийн буцаах бүтэц (зөвхөн UI-д хэрэгтэй талбарууд,
// api/src/enrollment-windows/enrollment-windows.service.ts-ийн select-тэй тохирно).
export interface EnrollmentWindow {
  subject: EnrollmentSubject;
  status: EnrollmentStatus;
  availability: SubjectAvailability;
  note: string | null;
}

// Дэлгэцэнд гарах дараалал — Prisma enum-ы бичигдсэн дарааллаас гаргав, гэхдээ
// эндээс тодорхой (findAll orderBy-аас хамаарахгүй) байлгав.
export const SUBJECT_ORDER: EnrollmentSubject[] = [
  "MATH",
  "SOCIAL_STUDIES",
  "SAT",
];

export const SUBJECT_LABEL: Record<EnrollmentSubject, string> = {
  MATH: "Математик",
  SOCIAL_STUDIES: "Нийгэм судлал",
  SAT: "SAT",
};

export const STATUS_OPTIONS: { v: EnrollmentStatus; t: string }[] = [
  { v: "OPEN", t: "Нээлттэй" },
  { v: "COMING_SOON", t: "Удахгүй" },
  { v: "CLOSED", t: "Дууссан" },
];

export const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  OPEN: "Нээлттэй",
  CLOSED: "Дууссан",
  COMING_SOON: "Удахгүй",
};

export const STATUS_ICON: Record<EnrollmentStatus, string> = {
  OPEN: "✓",
  CLOSED: "✕",
  COMING_SOON: "⏳",
};

// Өнгө ганцаараа мэдээлэл дамжуулдаггүй — шошго/дүрс үргэлж хамт байна,
// эдгээр класс зөвхөн НЭМЭЛТ хурдан танигдах шинж чанар.
export const STATUS_BADGE_CLS: Record<EnrollmentStatus, string> = {
  OPEN: "bg-success/10 text-success",
  CLOSED: "bg-error/10 text-error",
  COMING_SOON: "bg-warning/10 text-warning",
};

export function statusBtnCls(active: boolean, status: EnrollmentStatus): string {
  const base =
    "rounded-lg border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50";
  if (!active) return `${base} border-line text-ink-dim hover:border-brand`;
  const activeCls: Record<EnrollmentStatus, string> = {
    OPEN: "border-success bg-success/10 text-success",
    CLOSED: "border-error bg-error/10 text-error",
    COMING_SOON: "border-warning bg-warning/10 text-warning",
  };
  return `${base} ${activeCls[status]}`;
}

export const AVAILABILITY_OPTIONS: { v: SubjectAvailability; t: string }[] = [
  { v: "BOTH", t: "Танхим ба онлайн" },
  { v: "CLASSROOM_ONLY", t: "Зөвхөн танхим" },
  { v: "ONLINE_ONLY", t: "Зөвхөн онлайн" },
];

export const AVAILABILITY_LABEL: Record<SubjectAvailability, string> = {
  BOTH: "Танхим ба онлайн",
  CLASSROOM_ONLY: "Зөвхөн танхим",
  ONLINE_ONLY: "Зөвхөн онлайн",
};

export function availabilityBtnCls(active: boolean): string {
  const base =
    "rounded-lg border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50";
  return active
    ? `${base} border-brand-bright bg-brand-bright/10 text-brand-soft`
    : `${base} border-line text-ink-dim hover:border-brand`;
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}
