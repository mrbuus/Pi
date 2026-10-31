/**
 * Танхимын сурагч V2 — `api/src/student-hub/*` (STUDENT) гэрээний төрөл.
 * Эх сурвалж: docs/v2/SURAGCH-V2-GEREE.md (2026-10-31). Талбарын нэрийг гэрээнээс
 * өөрчлөхгүй — сервер яг ийм хэлбэрээр буцаана.
 */
import type { AttendanceStatus, HomeworkStatus } from "@/components/attendance/marks";
import type { LateRangeValue } from "@/components/attendance/LateRangePicker";

export type { AttendanceStatus, HomeworkStatus, LateRangeValue };

/** GET /student-hub/overview */
export interface HubOverview {
  classrooms: { id: string; name: string }[];
  /** rate = (PRESENT+LATE)/total, 0..100 бүхэл, бүх хугацаа */
  attendance: { total: number; PRESENT: number; LATE: number; ABSENT: number; EXCUSED: number; rate: number };
  /** rate = (DONE + PARTIAL*0.5)/total */
  homework: { total: number; DONE: number; PARTIAL: number; NOT_DONE: number; rate: number };
  today: {
    classroomId: string;
    classroomName: string;
    date: string;
    startMinute: number;
    endMinute: number;
    room: string | null;
    topic: string | null;
  } | null;
  latestMark: { date: string; status: HomeworkStatus; comment: string | null } | null;
}

/** Хаалттай тестийн шалтгаан: TOMORROW → «Маргааш нээгдэнэ»; NOT_AVAILABLE → юу ч бичихгүй */
export type HubTestClosedReason = "TOMORROW" | "NOT_AVAILABLE";

export interface HubDayTest {
  /** null = гараар оруулсан (гарааны) тест — нэрээрээ харагдана, нээгдэхгүй */
  testId: string | null;
  title: string;
  variant: string | null;
  open: boolean;
  /** open=false үед л утгатай */
  closedReason: HubTestClosedReason | null;
}

export interface HubHomeworkPhoto {
  id: string;
  fileKey: string;
  pages: number;
  uploadedAt: string;
}

export interface HubDay {
  date: string;
  classroomId: string;
  classroomName: string;
  startMinute: number | null;
  endMinute: number | null;
  room: string | null;
  topic: string | null;
  /** Багш+ нэрэнд «+» серверээс ирнэ */
  teachers: string[];
  /** LessonRecord.problemNumbersText */
  problemNumbers: string | null;
  tests: HubDayTest[];
  attendance: { status: AttendanceStatus; lateRange: LateRangeValue | null } | null;
  /** D өдрийн даалгаврыг дараагийн хичээлийн өдөр (checkedOn = D') тэмдэглэнэ */
  homework: { status: HomeworkStatus | null; comment: string | null; checkedOn: string | null };
  theory: { count: number; mine: boolean; canUpload: boolean; assignedToMe: boolean };
  homeworkPhoto: HubHomeworkPhoto | null;
  /** D ≥ today-13 ба D ≤ today */
  canSendHomework: boolean;
}

/** GET /student-hub/days?month=YYYY-MM */
export interface HubDaysResponse {
  month: string;
  prevMonth: string | null;
  nextMonth: string | null;
  /** Огноогоор буурах */
  days: HubDay[];
}

/** GET /student-hub/tests?q= — огноогоор буурах */
export interface HubTestListItem {
  testId: string | null;
  title: string;
  variant: string | null;
  date: string;
  classroomName: string;
  problemCount: number;
  open: boolean;
  /** open=false үед л утгатай */
  closedReason: HubTestClosedReason | null;
}

export interface HubProblemChoice {
  label: string;
  text: string;
  imageKey: string | null;
}

export interface HubProblem {
  id: string;
  order: number;
  stem: string;
  imageKey: string | null;
  choices: HubProblemChoice[];
  correctAnswer: string;
  hasVideo: boolean;
}

/** GET /student-hub/tests/:testId — 403: анги хийгээгүй, эсвэл өнөөдөр хийсэн (маргааш нээгдэнэ) */
export interface HubTestDetail {
  testId: string;
  title: string;
  variant: string | null;
  date: string;
  problems: HubProblem[];
}

/** GET /attendance/my — сурагчийн бүх ирц (тайлбаргүй), огноогоор буурах */
export interface MyAttendanceRow {
  date: string;
  status: AttendanceStatus;
  classroom: { id: string; name: string } | null;
}
