/** GET /class-dashboard ба /class-dashboard/classes/:id-ийн хариу (api/src/class-dashboard). */

export type PaymentState = "PAID" | "PARTIAL" | "PENDING" | "NONE";
export type RiskFlag = "LOW_ATTENDANCE" | "LOW_HOMEWORK" | "LOW_SCORE" | "FALLING" | "MISSED_EXAMS";
export type DriverKey = "exam" | "practice" | "homework" | "attendance";

export interface Permissions {
  money: boolean;
  manageClass?: boolean;
  manageClasses?: boolean;
  isAdmin: boolean;
}

export interface PersonRef {
  id: string;
  name: string;
}

export interface ClassCard {
  id: string;
  name: string;
  type: "IN_PERSON" | "ONLINE";
  grade: number | null;
  /** Ангийн багш ба туслах ангийн багш (дээд тал нь хоёр) */
  classTeacher: PersonRef | null;
  assistantTeacher: PersonRef | null;
  /** Ангийн багш нар + хуваарийн бусад багш (хайлтад) */
  teachers: string[];
  students: number;
  attendanceRate: number | null;
  homeworkRate: number | null;
  examAvg: number | null;
  examCount: number;
  riskCount: number;
  lastLesson: { date: string; topic: string | null } | null;
  payment: Record<PaymentState, number> | null;
}

export interface ClassListResponse {
  windowDays: number;
  permissions: Permissions;
  classes: ClassCard[];
}

export interface CompetencyDriver {
  key: DriverKey;
  label: string;
  value: number;
  weight: number;
  points: number;
  samples: number;
}

export interface Competency {
  version: string;
  score: number | null;
  level: string | null;
  confidence: "low" | "medium" | "high" | null;
  drivers: CompetencyDriver[];
  missing: DriverKey[];
  guessPenalty: number;
  guessedShare: number | null;
  trend: { at: string; value: number }[];
  change: number | null;
  updatedAt?: string;
}

export interface ActiveFlag {
  id: string;
  kind: string;
  note: string | null;
  createdAt: string;
  createdByName: string;
}

export interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string | null;
  attendance: { rate: number | null; marked: number; absent: number };
  homework: { rate: number | null; marked: number };
  exam: { avg: number | null; last: number | null; taken: number; missed: number; trend: number[] };
  /** Сүүлийн 14 хоногийн бие даасан бодлого (бүх эх сурвалж) ба тест */
  practice: { attempts: number; accuracy: number | null; guessed: number; tests: number };
  makeup: number | null;
  lagging: { name: string; percent: number }[];
  competency: Competency;
  predictedEesh: number | null;
  risk: RiskFlag[];
  flags: ActiveFlag[];
  payment: { state: PaymentState; tuitionAmount: number | null; paidThisMonth: number } | null;
}

export interface WeekRate {
  week: string;
  rate: number | null;
  n: number;
}

export interface ExamRow {
  testId: string;
  title: string;
  type: string;
  assignedAt: string;
  students: number;
  taken: number;
  absent: number;
  pending: number;
  avg: number | null;
  bins: number[];
  results: { studentId: string; percent: number }[];
}

export interface TopicAccuracy {
  key: string;
  name: string;
  earned: number;
  max: number;
  percent: number;
  lost: number;
}

export interface PracticeTopic {
  topicId: string;
  name: string;
  attempts: number;
  students: number;
  correct: number;
  guessed: number;
  accuracy: number | null;
}

export interface ClassDashboard {
  generatedAt: string;
  windowDays: number;
  practiceDays: number;
  makeupDays: number;
  classroom: {
    id: string;
    name: string;
    type: "IN_PERSON" | "ONLINE";
    grade: number | null;
    classTeacher: PersonRef | null;
    assistantTeacher: PersonRef | null;
  };
  permissions: Permissions;
  teachers: { id: string; name: string; roles: ("CLASS" | "CLASS_ASSISTANT" | "SCHEDULE" | "LEAD" | "ASSISTANT")[] }[];
  schedule: {
    weekday: number;
    startMinute: number;
    endMinute: number;
    room: string | null;
    subject: string | null;
    teacher: string | null;
  }[];
  summary: {
    students: number;
    attendanceRate: number | null;
    homeworkRate: number | null;
    examAvg: number | null;
    exams: number;
    riskCount: number;
    improvedCount: number;
    makeupStudents: number;
    competencyAvg: number | null;
    competencyCovered: number;
  };
  attendanceTrend: WeekRate[];
  homeworkTrend: WeekRate[];
  practice: { activeStudents: number; attempts: number; accuracy: number | null; tests: number };
  payment: ({ month: string } & Record<PaymentState, number>) | null;
  syllabus: {
    current: {
      chapterId: string;
      title: string;
      book: string | null;
      topic: string | null;
      position: number | null;
      total: number | null;
      source: "MANUAL" | "LESSON_TOPIC" | "EXAM" | null;
    } | null;
    confirmedLessons: number;
    recentLessons: {
      id: string;
      date: string;
      startMinute: number;
      topic: string | null;
      lead: string | null;
      assistant: string | null;
      present: number;
      absent: number;
      enrolled: number;
    }[];
  };
  exams: ExamRow[];
  topics: { exam: TopicAccuracy[]; practice: PracticeTopic[] };
  problems: {
    testId: string;
    testTitle: string;
    label: string;
    problemId: string;
    statement: string | null;
    marked: number;
    wrong: number;
    percentWrong: number;
  }[];
  students: StudentRow[];
}

/** GET /class-dashboard/classes/:id/month — сарын тор */
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type HomeworkStatus = "DONE" | "PARTIAL" | "NOT_DONE";
export type MonthMetric = "attendance" | "homework" | "exams" | "independent";

export interface MonthDay {
  date: string;
  weekday: number;
  scheduled: boolean;
  holiday: string | null;
  confirmed: boolean;
}

export interface MonthExam {
  testId: string;
  title: string;
  type: string;
  assignedAt: string;
  day: string;
  students: number;
  taken: number;
  absent: number;
  absentIds: string[];
  avg: number | null;
  bins: number[];
  results: Record<string, number>;
}

export interface IndependentDay {
  problems: number;
  correct: number;
  judged: number;
  tests: number;
}

export interface StudentMonthStats {
  attendance: { rate: number | null; present: number; late: number; absent: number; excused: number };
  homework: { rate: number | null; done: number; partial: number; notDone: number };
  exam: { avg: number | null; taken: number; missed: number };
  independent: { problems: number; accuracy: number | null; activeDays: number; tests: number; testAvg: number | null };
}

export interface ClassMonthStats {
  attendance: number | null;
  homework: number | null;
  exam: number | null;
  problems: number | null;
  accuracy: number | null;
  activeDays: number | null;
  tests: number | null;
}

export interface MonthStudent {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string | null;
}

export interface MonthData {
  month: string;
  current: string;
  prev: string;
  next: string | null;
  today: string;
  students: MonthStudent[];
  days: MonthDay[];
  weeks: { start: string; end: string }[];
  attendance: Record<string, Record<string, AttendanceStatus>>;
  homework: Record<string, Record<string, HomeworkStatus>>;
  exams: MonthExam[];
  independent: Record<string, Record<string, IndependentDay>>;
  selfTests: Record<string, { testId: string; title: string; day: string; percent: number | null }[]>;
  stats: { students: Record<string, StudentMonthStats>; class: ClassMonthStats };
}

export interface FlagHistoryRow {
  id: string;
  kind: string;
  label: string;
  note: string | null;
  classroomId: string | null;
  createdAt: string;
  createdByName: string;
  removedAt: string | null;
  removedByName: string | null;
  removeNote: string | null;
}
