// GET /analytics/* хариунуудын хэлбэр — api/src/analytics/analytics.service.ts-тэй
// яг таарч байх ёстой.

export interface AnalyticsRangeMeta {
  from: string;
  to: string;
  days: number;
}

export interface OverviewResponse {
  range: AnalyticsRangeMeta;
  dau: number;
  wau: number;
  mau: number;
  avgSessionMs: number;
  totalActiveStudents: number;
  totalProblemsAttempted: number;
  eventStreamAgeDays: number;
  lowConfidence: boolean;
}

export interface EngagementDay {
  date: string;
  activeStudents: number;
}

export interface EngagementResponse {
  range: AnalyticsRangeMeta;
  eventStreamAgeDays: number;
  lowConfidence: boolean;
  days: EngagementDay[];
}

export interface ClassroomRow {
  classroomId: string;
  classroomName: string;
  enrolled: number;
  active: number;
  participationRate: number; // 0..1
  avgProblemsPerActiveStudent: number;
}

export interface ClassroomsResponse {
  range: AnalyticsRangeMeta;
  classrooms: ClassroomRow[];
}

export interface TopicRow {
  chapterId: string;
  chapterTitle: string;
  bookTitle: string | null;
  totalAttempts: number;
  successRate: number; // 0..1
  lowSample: boolean;
}

export interface TopicsResponse {
  range: AnalyticsRangeMeta;
  minSample: number;
  topics: TopicRow[];
}

export type AtRiskReason = "INACTIVE" | "DECLINING";

export interface AtRiskStudent {
  studentId: string;
  name: string;
  classroomId: string;
  classroomName: string;
  lastActiveAt: string | null;
  recentSuccessRate: number | null;
  priorSuccessRate: number | null;
  reasons: AtRiskReason[];
}

export interface AtRiskResponse {
  windowDays: number;
  generatedAt: string;
  students: AtRiskStudent[];
}

export interface DateRangeValue {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}
