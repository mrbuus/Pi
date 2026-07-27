// Контент CMS-ийн (Ном/Бүлэг/БҮТ муж/Бодлого/Бичлэг/Тест) хуваалцсан төрлүүд.

export type Subject = "MATH" | "SOCIAL_STUDIES";

export const SUBJECTS: { v: Subject; t: string }[] = [
  { v: "MATH", t: "Математик" },
  { v: "SOCIAL_STUDIES", t: "Нийгмийн ухаан" },
];

export const SUBJECT_LABEL: Record<Subject, string> = {
  MATH: "Математик",
  SOCIAL_STUDIES: "Нийгмийн ухаан",
};

export const FORMATS = [
  { v: "CHOICE", t: "Сонгох (A–E)" },
  { v: "FILL_NUMBER", t: "Тоо нөхөх" },
  { v: "OPEN", t: "Задгай хариулт" },
];

export interface Book {
  id: string;
  code: string;
  title: string;
  subject: Subject;
  archived: boolean;
  coverKey?: string | null;
  sourceLabel?: string | null;
  problemCount?: number;
  testCount?: number;
  _count: { chapters: number };
}

export interface Topic {
  id: string;
  name: string;
  order: number;
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  grade?: number | null;
  freePreview: boolean;
  bookId?: string | null;
  topicId?: string | null;
  book?: { code: string; title: string } | null;
  _count: { problems: number; theories: number; tests?: number };
}

export interface Problem {
  id: string;
  token: string;
  format: string;
  statementText?: string;
  points: number;
}

export interface VideoItem {
  id: string;
  title: string;
  s3Key: string;
  chapterId: string | null;
  duration?: number | null;
}

export interface ChapterWithVideos {
  id: string;
  title: string;
  book?: { code: string; title: string } | null;
  _count: { videos: number };
}

export interface TestItem {
  id: string;
  title: string;
  type: string;
  gradingMode: string;
  timeLimitMin?: number | null;
  variantLabel?: string | null;
  groupKey?: string | null;
  chapter?: { book?: { code: string } | null } | null;
  createdAt: string;
  _count: { problems: number; results: number };
}

/** API алдааг хэрэглэгчид харуулах эвтэй мессеж болгоно. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

export type Msg = { kind: "success" | "error"; text: string } | null;
