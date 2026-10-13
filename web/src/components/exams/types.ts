/* ============================================================================
 * «Шалгалт» хэсэг (SHALGALT-TOLOVLOGOO) — API-ийн төрлүүд ба цэвэр туслахууд.
 * API: /exams (жагсаалт), /exams/:id/gradebook, /exams/:id/settings …
 * ========================================================================== */

import { thousandSortKey } from "@/components/test-list/types";

export type ExamStatus = "UNASSIGNED" | "IN_PROGRESS" | "MISSING" | "DONE";
export type ExamType = "CHAPTER_EXAM" | "EESH_MOCK" | "THOUSAND";

export interface ExamClassChip {
  id: string;
  name: string;
}

export interface ExamOverviewRow {
  id: string;
  title: string;
  type: ExamType;
  groupKey: string | null;
  variantLabel: string | null;
  gradingMode: "AUTO" | "MANUAL";
  timeLimitMin: number | null;
  isDraft: boolean;
  createdById: string;
  bookCode: string | null;
  problemCount: number;
  classes: ExamClassChip[];
  studentCount: number;
  resultCount: number;
  absentCount: number;
  inProgressCount: number;
  avgPercent: number | null;
  status: ExamStatus;
}

export interface ExamOverview {
  canEditContent: boolean;
  manageAllClasses: boolean;
  classes: ExamClassChip[];
  exams: ExamOverviewRow[];
}

export type ItemStatus = "CORRECT" | "WRONG" | "BLANK";

export interface GradebookItem {
  key: string;
  label: string;
  part: 1 | 2;
  points: number;
  order: number;
}

export interface GradebookRow {
  studentId: string;
  firstName: string;
  lastName: string;
  classroomId: string;
  classroomName: string;
  absent: boolean;
  result: {
    totalScore: number;
    maxScore: number;
    source: string;
    version: number;
    updatedAt: string;
  } | null;
  lock: "ONLINE" | "IN_PROGRESS" | null;
  marks: Record<string, ItemStatus> | null;
  markSource: "ONLINE" | "MANUAL" | "EXCEL" | "OMR" | "MIXED" | null;
  part1: number | null;
  part2: number | null;
}

export interface Gradebook {
  test: {
    id: string;
    title: string;
    type: string;
    gradingMode: string;
    maxScore: number;
    part1Max: number;
    part2Max: number;
  };
  items: GradebookItem[];
  classes: (ExamClassChip & { assigned: boolean })[];
  classroomId: string | null;
  canOverrideOnline: boolean;
  rows: GradebookRow[];
}

export interface SaveResult {
  saved: number;
  failed: number;
  results: ({
      studentId: string;
      ok: true;
      absent: boolean;
      totalScore?: number;
      maxScore?: number;
      unchanged?: boolean;
      /** Ачаалснаас хойш өөр багш энэ мөрийг өөрчилсөн — нүдний түвшинд нэгтгэсэн */
      merged?: boolean;
    }
    | { studentId: string; ok: false; error: string })[];
}

export type PreviewStatus =
  | "READY"
  | "EMPTY"
  | "ABSENT"
  | "TOTAL_ONLY"
  | "LOCKED"
  | "UNMATCHED"
  | "AMBIGUOUS"
  | "DUPLICATE";

export interface ExcelPreview {
  sheets: string[];
  sheet: string;
  maxScore: number;
  errors: string[];
  warnings: string[];
  rows: {
    rowNumber: number;
    name: string;
    group: string;
    status: PreviewStatus;
    studentId: string | null;
    studentName: string | null;
    wrong: string[];
    total: number | null;
    odd: string[];
  }[];
  missingStudents: { studentId: string; name: string }[];
}

export interface ScoringGroup {
  label: string;
  boxes: string[];
  points: number;
}

export interface ExamSettings {
  /** PATCH /scoring-groups хариунд: өөрчлөлт бичсэн эсэх, бусдын өөрчлөлттэй нэгтгэсэн бол нэр */
  saved?: { changed: boolean; mergedWith: string[] | null };
  test: {
    id: string;
    title: string;
    type: string;
    gradingMode: string;
    timeLimitMin: number | null;
    price?: number | null;
    taken: boolean;
    /** Буцаах/түүх: PATCH /tests/:id-д expectedVersion */
    version?: number;
  };
  permissions: {
    canEditContent: boolean;
    canEditTime: boolean;
    canSetPrice: boolean;
    manageAllClasses: boolean;
    reviewGate: boolean;
  };
  reviewAutoDays: number;
  classes: {
    id: string;
    name: string;
    assigned: boolean;
    assignedAt?: string;
    reviewMode?: "AUTO" | "NONE" | "PROBLEMS" | "FULL";
    reviewLevel?: "NONE" | "PROBLEMS" | "FULL";
    reviewAutoAt?: string;
    reviewOpenedBy?: string | null;
    studentCount?: number;
    submittedCount?: number;
    startedCount?: number;
  }[];
  problems: {
    problemId: string;
    order: number;
    format: string;
    points: number;
    /** Бодлогын хувилбар — алхмын багц хадгалахад expectedVersion */
    version?: number;
    letters?: string[];
    groups?: ScoringGroup[] | null;
    effective?: boolean;
    statementText?: string | null;
    imageKey?: string | null;
  }[];
}

export interface StudentView {
  id: string;
  title: string;
  timeLimitMin: number | null;
  totalPoints: number;
  problems: {
    n: number;
    format: string;
    points: number;
    statementText: string | null;
    imageKey: string | null;
    choices: { letter: string; text: string | null; image?: string | null }[] | null;
    slots: string[] | null;
  }[];
}

// ---------------------------------------------------------------------------

export const SERIES: { value: ExamType; label: string }[] = [
  { value: "THOUSAND", label: "1000 бодлого" },
  { value: "CHAPTER_EXAM", label: "Сэдвийн шалгалт" },
  { value: "EESH_MOCK", label: "ЭЕШ сорил" },
];

export const STATUS_LABEL: Record<ExamStatus, string> = {
  UNASSIGNED: "Оноогоогүй",
  IN_PROGRESS: "Өгч байна",
  MISSING: "Дүн дутуу",
  DONE: "Дууссан",
};

export { THOUSAND_TOPIC as THOUSAND_GROUP, thousandShortTitle as shortTitle } from "@/components/test-list/types";

/** 1000 бодлого: Явцын 1-A…6-A, дараа нь Сорил 7-A…22-A. */
export function thousandOrder(groupKey: string | null, title: string): number {
  return thousandSortKey({ groupKey, title });
}

export function percent(total: number | null | undefined, max: number | null | undefined): number | null {
  if (total === null || total === undefined || !max || max <= 0) return null;
  return Math.round((total / max) * 100);
}

export function errorText(e: unknown, fallback = "Алдаа гарлаа"): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/** base64 Excel-ийг файл болгон татна (YouTube экспорттой ижил). */
export function downloadBase64(res: { filename: string; mime: string; base64: string }) {
  const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: res.mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = res.filename;
  a.click();
  URL.revokeObjectURL(url);
}
