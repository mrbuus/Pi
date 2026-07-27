// api/src/progress/{progress.controller.ts,progress.service.ts}-той (2026-07-27
// байдлаар) тулгаж бичсэн ЖИНХЭНЭ contract хэлбэрүүд. Эдгээр хариунууд аль хэдийн
// бэлэн болсон сервисийн кодтой шууд тулгагдсан (таамаглал биш) — эсрэгээрээ,
// доор тэмдэглэсэн цөөн зайг (жишээ нь: timeline дэх attemptId дутуу байгаа)
// зориуд тайлбарлав, учир нь api/src/progress бол миний эзэмшдэг файл БИШ.

export type EngagementLevel = "ACTIVE" | "SLOWING" | "DORMANT";

export interface ActivePassInfo {
  name: string;
  expiresAt: string; // ISO
}

// GET /progress/online-students -ийн нэг мөр (ProgressService.onlineStudentsRoster)
export interface OnlineStudentListItem {
  studentId: string;
  studentCode: string | null;
  name: string; // сервер дээр аль хэдийн "Овог Нэр" болгож нэгтгэсэн
  grade: number | null;
  activePass: ActivePassInfo | null;
  lastActiveAt: string | null;
  problemsAttempted: { last7d: number; last30d: number };
  successRate: number | null; // сүүлийн 30 хоногийн, 0–100 эсвэл attempts=0 бол null
  testsTaken: number;
  engagement: EngagementLevel;
}

export interface OnlineStudentsResponse {
  page: number;
  pageSize: number;
  total: number;
  items: OnlineStudentListItem[];
}

// Backend зөвхөн эдгээр хоёр утгыг л ойлгодог (passStatus=ACTIVE → идэвхтэй
// эрхтэй; passStatus=EXPIRED → идэвхтэй эрхгүй) — "дуусах дөхсөн"/"огт байгаагүй"
// гэсэн ялгаа сервер талд алга.
export type PassFilter = "ACTIVE" | "EXPIRED";

export interface OnlineStudentsQuery {
  search: string;
  passStatus: PassFilter | "ALL";
  activity: EngagementLevel | "ALL";
}

// GET /progress/student/:id -ийн chapters мөр (ProgressService.getStudentDepth)
export interface ChapterProgressRow {
  chapterId: string;
  title: string;
  theoryRead: boolean;
  videosWatched: number;
  problemsAttempted: number;
  problemsCorrect: number;
  successRate: number | null; // attempts=0 бол null
}

export interface WeakTagRow {
  tag: string;
  type: string;
  attempts: number;
  successRate: number;
}

// TestType enum (schema.prisma) — тестийн ТӨРӨЛ, AttemptSource биш
export type TestType = "DAILY" | "CHAPTER_EXAM" | "EESH_MOCK" | "CUSTOM" | "THEORY";

export interface TestHistoryRow {
  testId: string;
  title: string;
  type: TestType;
  totalScore: number;
  maxScore: number;
  createdAt: string;
}

export interface PassHistoryRow {
  name: string;
  startsAt: string;
  expiresAt: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
}

export interface DailyActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isHoliday: boolean;
  isClassDay: boolean;
}

export interface DailyActivity {
  year: number;
  totalActiveDays: number;
  days: DailyActivityDay[];
}

export interface OnlineStudentDetail {
  student: {
    id: string;
    studentCode: string | null;
    name: string;
    grade: number | null;
    school: string | null;
  };
  activePass: ActivePassInfo | null;
  passHistory: PassHistoryRow[];
  streak: StreakInfo;
  dailyActivity: DailyActivity;
  chapters: ChapterProgressRow[];
  weakestTopics: WeakTagRow[];
  tests: TestHistoryRow[];
  // ⚠️ Backend энэ талбарыг буцаадаггүй — эрхийн бодит хамгаалалт мутаци бүрт
  // (PATCH/DELETE/POST) сервер дээр @Roles(ADMIN, TEACHER_PLUS)-ээр хийгдэнэ.
  // Frontend талд зөвхөн ХЯНАЛТУУДЫГ ХАРУУЛАХ/НУУХ зорилгоор getRole()-оос
  // тооцно (OnlineStudentDetailClient.tsx-ийг үзнэ үү) — жинхэнэ хамгаалалт биш.
}

// GET /progress/student/:id/timeline -ийн нэг мөр (ProgressService.getTimeline)
// ⚠️⚠️ АНХААР: одоогийн backend ATTEMPT мөрөнд Attempt.id-г ДАМЖУУЛДАГГҮЙ
// (progress.service.ts мөр ~523–532 — зөвхөн problemToken/chapterTitle/selfState/
// autoCorrect/source/testId, id ОРООГҮЙ). Иймд "Засах"/"Устгах" товч зөвхөн
// attemptId ирсэн үед л харагдана (доор attemptId?: заавал биш) — одоохондоо
// ХАРАГДАХГҮЙ. Backend нэмэлтээр `id: a.id`-г нэгтгэвэл frontend өөрчлөлтгүйгээр
// шууд ажиллана. Энэ зайг API/progress багт тусад нь мэдэгдэх шаардлагатай.
export interface TimelineEventEvent {
  kind: "EVENT";
  at: string;
  type: string; // LearningEventType
  sessionId?: string | null;
  problemId?: string | null;
  chapterId?: string | null;
  videoId?: string | null;
  testId?: string | null;
  durationMs?: number | null;
  meta?: Record<string, unknown> | null;
}

export interface TimelineEventAttempt {
  kind: "ATTEMPT";
  at: string;
  source: string; // AttemptSource
  problemToken: string;
  chapterTitle: string;
  selfState: string | null;
  autoCorrect: boolean | null;
  testId?: string | null;
  attemptId?: string; // ирвэл л засах/устгах идэвхжинэ — дээрх тайлбарыг үз
}

export type TimelineEvent = TimelineEventEvent | TimelineEventAttempt;

export interface TimelineResponse {
  items: TimelineEvent[];
}

// Тестийн сонголтын picker — /tests-ийн бодит хариутай тулгасан
// (web/src/app/app/tests/page.tsx-ийн TestRow-той нийцнэ).
export interface TestPickerRow {
  id: string;
  title: string;
  type: string;
  chapter?: {
    book?: { code: string } | null;
    title?: string;
    topic?: { name?: string } | null;
  } | null;
}
