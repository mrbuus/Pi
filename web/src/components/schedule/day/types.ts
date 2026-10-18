import type { WeekEntry } from "../types";

/** «DISMISS» = тарах, «STAY» = үлдэнэ — зөвхөн ажилтанд */
export type DismissMode = "DISMISS" | "STAY";

export interface StaffRef {
  id: string;
  name: string;
  role: string | null;
}

/** GET /schedule/day-plan — мөр бүр */
export interface DayEntry extends Omit<WeekEntry, "leadTeacher" | "assistantTeacher"> {
  leadTeacher: StaffRef | null;
  assistantTeacher: StaffRef | null;
  /** Төлөвлөгөө/оноолтын түлхүүр огноо (зөөгдсөн бол анхны) */
  occurrenceDate: string;
  students: number;
  /** Нэвтэрсэн хүн энэ хичээлийн багш эсэх */
  mine: boolean;
  plan: {
    testIds: string[];
    dismissMode: DismissMode | null;
    photoStudent: { id: string; name: string } | null;
  } | null;
  previous: { date: string; tests: { testId: string; excludedNumbers: number[] }[] } | null;
  done: {
    sessionId: string;
    testId: string | null;
    manualTitle: string | null;
    excludedNumbers: number[];
    excludedProblemIds: string[];
  }[];
  note: { body: string; updatedByName: string; updatedAt: string } | null;
  record: {
    confirmedByName: string;
    confirmedAt: string;
    testCount: number;
    enrolledCount: number;
    presentCount: number;
    absentCount: number;
    attendanceMarked: number;
  } | null;
  dismissalAt: string | null;
}

export interface TestInfo {
  testId: string;
  title: string;
  short: string;
  variant: string | null;
  bookTitle: string | null;
  chapterTitle: string | null;
  problemIds: string[];
}

export interface DayPlanResponse {
  date: string;
  today: string;
  isHoliday: boolean;
  holiday: { type: string; title: string } | null;
  restingClasses: { classroomId: string; classroomName: string; title: string }[];
  viewer: { role: string; canPlan: boolean; canConfirm: boolean };
  /** «Багшийн ажлын өдөр» хүснэгтээр тухайн өдөр ажиллах багш (хүснэгтийн дарааллаар) */
  roster: {
    parity: 1 | 2;
    mode: "FIXED" | "ALTERNATING";
    inRange: boolean;
    teachers: StaffRef[];
  } | null;
  entries: DayEntry[];
  tests: Record<string, TestInfo>;
}

/** GET /classrooms/:id/roadmap */
export type RoadmapStatus = "DONE" | "REMOVED" | "SKIPPED" | "TODO";
export interface RoadmapTest {
  testId: string;
  title: string;
  short: string;
  variant: string | null;
  problemCount: number;
  status: RoadmapStatus;
  doneOn?: string;
  excludedNumbers?: number[];
  plannedOn?: string;
}
export interface Roadmap {
  books: {
    code: string;
    title: string;
    topics: {
      name: string;
      chapters: { chapterId: string; order: number; title: string; tests: RoadmapTest[] }[];
    }[];
  }[];
  next: string[];
}

/** GET /schedule/:id/plan */
export interface PlanContext {
  scheduleId: string;
  classroomId: string;
  date: string;
  occurrenceDate: string;
  plan: {
    testIds: string[];
    dismissMode: DismissMode | null;
    photoStudentId: string | null;
    title: string | null;
  } | null;
  roster: { id: string; name: string }[];
  photoSuggestion: string | null;
}

/** Ангид хийх хувилбар (A) — нэг бүлгийн нэгж */
export interface TestUnit {
  chapterId: string;
  bookCode: string;
  bookTitle: string;
  topic: string;
  test: RoadmapTest;
}

/** Замын зургийг ангид хийх хувилбарын (A) нэгж болгон хавтгайруулна — номын дарааллаар */
export function roadmapUnits(map: Roadmap | null): TestUnit[] {
  if (!map) return [];
  const out: TestUnit[] = [];
  for (const b of map.books)
    for (const t of b.topics)
      for (const c of t.chapters) {
        const test = c.tests.find((x) => (x.variant ?? "").toUpperCase() === "A") ?? c.tests[0];
        if (test) out.push({ chapterId: c.chapterId, bookCode: b.code, bookTitle: b.title, topic: t.name, test });
      }
  return out;
}

export const DISMISS_LABEL: Record<DismissMode, string> = { DISMISS: "Тарах", STAY: "Үлдэнэ" };

/** «Тоо тоолол 1 — 100x100, A хувилбар» — урт нэр (hover / удаан дарах) */
export function fullTestTitle(t: Pick<TestInfo, "title" | "bookTitle" | "variant">): string {
  return [t.title, t.bookTitle, t.variant ? `${t.variant} хувилбар` : null].filter(Boolean).join(" — ");
}

export const shortClass = (name: string) => name.replace(/\s*\([^)]*\)$/, "");
export const branchOf = (name: string) => (/Зүүн/.test(name) ? "Зүүн 4" : /Баруун/.test(name) ? "Баруун 4" : "Бусад");
