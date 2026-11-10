/**
 * Нөхөлт (эзэн 2026-11-08): өөр ангид суусан, 406 өрөөнд нөхсөн сурагч.
 * API: api/src/makeup-visits (MakeupHistoryItem, VisitView) — талбарын нэр ЯГ ижил.
 */
import type { AttendanceStatus, HomeworkStatus, LateRangeValue } from "@/components/TeacherDashboard/board/lib";

/** Ангийн сонголт дахь 406 өрөө (ангийн id cuid тул давхцахгүй) */
export const ROOM406_ID = "406";

export type CoveredSource = "CONFIRMED" | "PLANNED" | "RECORDED";

export interface CoveredTest {
  /** MakeupVisitTest.id (406) — зочилсон ангийнх бол null */
  id: string | null;
  testId: string | null;
  title: string;
  variant: string | null;
  /** CONFIRMED = анги баталсан, PLANNED = төлөвлөгөө (батлаагүй), RECORDED = 406-д багш сонгосон */
  source: CoveredSource;
  result: { score: number; max: number } | null;
}

export interface MakeupHistoryItem {
  id: string;
  date: string;
  place: { kind: "CLASS"; classroomId: string; name: string } | { kind: "ROOM_406"; classroomId: null; name: "406" };
  label: string;
  homeClassroom: { id: string; name: string } | null;
  tests: CoveredTest[];
  comment: string | null;
  attendance: { status: AttendanceStatus | null; lateRange: LateRangeValue | null; note: string | null };
  homework: { status: HomeworkStatus | null; note: string | null };
  teacher: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface VisitView extends MakeupHistoryItem {
  student: { id: string; firstName: string; lastName: string; code: string | null };
  updatedBy: { id: string; name: string } | null;
}

export interface SearchHit {
  id: string;
  firstName: string;
  lastName: string;
  code: string | null;
  classes: { id: string; name: string }[];
}

export interface ClassOption {
  id: string;
  name: string;
  studentCount: number;
}

export interface ClassStudent {
  id: string;
  firstName: string;
  lastName: string;
  classroom: { id: string; name: string };
}

export type SkipReason = "DUPLICATE" | "OWN_CLASS" | "NOT_STUDENT";
export interface CreateResult {
  created: VisitView[];
  skipped: { studentId: string; reason: SkipReason }[];
}

export const SKIP_TEXT: Record<SkipReason, string> = {
  DUPLICATE: "аль хэдийн нэмэгдсэн",
  OWN_CLASS: "энэ ангийн сурагч",
  NOT_STUDENT: "сурагч биш",
};

export interface HomeBadge {
  visitId: string;
  studentId: string;
  hostClassroomId: string | null;
  hostName: string;
  label: string;
}

/** «12-6 (Баруун 4)» → «12-6» */
export const shortClass = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name;

/** «Батчулуун Дэлгэрдалай» — овог нэр бүтнээр (ижил нэртэйг ялгана) */
export const fullName = (s: { firstName: string; lastName: string }) => `${s.lastName} ${s.firstName}`.trim();
