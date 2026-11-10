/**
 * Сурагчийн хичээлийн хуанли ба сэдэв хөтөлбөр (эзэн 2026-11-08).
 * API: api/src/student-calendar (LessonDaysResponse, SyllabusResponse) — талбарын нэр ЯГ ижил.
 */
import type { AttendanceStatus, HomeworkStatus, LateRangeValue } from "@/components/TeacherDashboard/board/lib";
import type { MakeupHistoryItem } from "@/components/makeup-visits/types";

export interface LessonDay {
  key: string;
  date: string;
  classroomId: string;
  classroomName: string;
  own: boolean;
  scheduled: boolean;
  startMinute: number | null;
  endMinute: number | null;
  room: string | null;
  movedFrom: string | null;
  topic: string | null;
  lead: string | null;
  assistant: string | null;
  scheduleTeacher: string | null;
  tests: { testId: string | null; title: string; variant: string | null }[];
  testsText: string | null;
  confirmed: { description: string | null; problemNumbersText: string | null; by: string } | null;
  teacherNote: { body: string; by: string } | null;
  attendance: { status: AttendanceStatus; lateRange: LateRangeValue | null; note: string | null; markedBy: string | null } | null;
  homework: { status: HomeworkStatus | null; comment: string | null; markedBy: string | null } | null;
  quiz: { score: number; problemCount: number } | null;
  future: boolean;
}

export interface LessonDaysResponse {
  from: string;
  to: string;
  today: string;
  firstDate: string | null;
  days: LessonDay[];
  makeups: MakeupHistoryItem[];
}

export type SyllabusStatus = "DONE" | "MISSING" | "TODO";
type Place = { kind: "CLASS" | "ROOM_406"; classroomId: string | null; name: string };

export type SyllabusEvent =
  | {
      kind: "CLASS";
      done: boolean;
      date: string;
      classroomId: string;
      classroomName?: string;
      attendance: AttendanceStatus | null;
      lead?: string | null;
      description?: string | null;
      teacherNote?: string | null;
    }
  | { kind: "PAST"; done: true; date: null; classroomId: string; classroomName?: string }
  | { kind: "MAKEUP"; done: true; date: string; visitId: string; place: Place; teacher: string | null; comment: string | null }
  | { kind: "BEFORE_JOIN"; done: false; date: string | null; classroomId: string; classroomName?: string };

export interface SyllabusTest {
  id: string;
  title: string;
  variant: string | null;
  status: SyllabusStatus;
  doneOn: string | null;
  events: SyllabusEvent[];
}

export interface SyllabusResponse {
  student: { id: string; name: string };
  classroom: { id: string; name: string } | null;
  summary: { done: number; missing: number; todo: number; total: number };
  books: {
    id: string;
    code: string;
    title: string;
    chapters: { id: string; order: number; title: string; tests: SyllabusTest[] }[];
  }[];
  other: SyllabusTest[];
}
