// /catalog/books API-ийн хэлбэр (api/src/content/books-catalog.service.ts)
export interface BookSummary {
  id: string;
  code: string;
  title: string;
  subject: string;
  topics: number;
  chapters: number;
  tests: number;
  solvableTests: number;
  freeTests: number;
  problems: number;
}

export interface TestItem {
  id: string;
  title: string;
  variantLabel: string | null;
  groupKey: string | null;
  timeLimitMin: number | null;
  type: string;
  problemCount: number;
  free: boolean;
  solvable: boolean;
}

export interface ChapterItem {
  id: string;
  title: string;
  label: string;
  order: number;
  problems: number;
  tests: TestItem[];
}

export interface TopicItem {
  name: string;
  chapters: ChapterItem[];
  tests: number;
  freeTests: number;
  problems: number;
}

export interface BookDetail {
  id: string;
  code: string;
  title: string;
  subject: string;
  topics: TopicItem[];
  freeTests: number;
}

// /catalog/try/tests/:id
export interface TryProblem {
  id: string;
  n: number;
  format: "CHOICE" | "FILL_NUMBER" | "OPEN" | string;
  statementText: string | null;
  points: number;
  imageKey: string | null;
  choiceMode: "TEXT" | "LETTER" | null;
  choices: string[] | null;
  choiceImages: (string | null)[] | null;
}

export interface TryView {
  id: string;
  title: string;
  variantLabel: string | null;
  timeLimitMin: number | null;
  type: string;
  book: { code: string; title: string };
  chapter: { id: string; title: string };
  problemCount: number;
  problems: TryProblem[];
}

export interface TryResult {
  score: number;
  max: number;
  answered: number;
  perProblem: Record<string, boolean | null>;
}

export type TryAnswers = Record<string, number | string>;

// /catalog/mock-exams
export interface MockEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  note: string | null;
  timeLimitMin: number | null;
  problemCount: number;
  registered: number;
  phase: "upcoming" | "live" | "done";
}
export interface MockPublic {
  live: MockEvent | null;
  next: MockEvent | null;
  upcoming: MockEvent[];
  last: { title: string; startsAt: string; participants: number; avgPct: number | null } | null;
}
export interface MockMine {
  registrations: { eventId: string; testId: string; status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED"; score: number | null; max: number | null }[];
}

const WD: Record<string, string> = { Sun: "Ням", Mon: "Даваа", Tue: "Мягмар", Wed: "Лхагва", Thu: "Пүрэв", Fri: "Баасан", Sat: "Бямба" };

/** Улаанбаатарын цагаар: «Ням, 10-р сарын 18, 11:00» */
export function fmtUb(iso: string | Date, withWeekday = true) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ulaanbaatar", weekday: "short", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const time = `${g("hour").padStart(2, "0")}:${g("minute")}`;
  return `${withWeekday ? `${WD[g("weekday")] ?? g("weekday")}, ` : ""}${g("month")}-р сарын ${g("day")}, ${time}`;
}

/** Үлдсэн хугацаа: «2 өдөр 5 цаг», «48 минут» */
export function fmtLeft(ms: number) {
  if (ms <= 0) return "одоо";
  const m = Math.floor(ms / 60_000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d >= 1) return h % 24 ? `${d} өдөр ${h % 24} цаг` : `${d} өдөр`;
  if (h >= 1) return m % 60 ? `${h} цаг ${m % 60} минут` : `${h} цаг`;
  return `${Math.max(1, m)} минут`;
}
