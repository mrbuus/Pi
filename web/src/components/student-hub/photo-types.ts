/**
 * Онолын зураг ба гэрийн даалгаврын зургийн төрлүүд (docs/v2/SURAGCH-V2-GEREE.md).
 * `types.ts`-ийг өөр агент (A хэсэг) бичдэг тул энд тусад нь.
 */
import type { TheoryDay } from "@/components/makeup/types";

/** Гэрийн даалгаврын зураг илгээх хугацаа: өнөөдөр ба сүүлийн 13 хоног (нийт 14) */
export const HOMEWORK_WINDOW_DAYS = 14;
/** Гэрийн даалгаврын дээд хуудас (эзэн) */
export const HOMEWORK_MAX_PAGES = 6;
/** Онолын зургийн дээд хуудас (эзэн) */
export const THEORY_MAX_PAGES = 10;

/** GET /lesson-day/:classroomId/:date/photos — V2 нэмэлт талбартай */
export interface TheoryDayV2 extends TheoryDay {
  /** Багш намайг томилсон эсэх (V2) */
  assignedToMe?: boolean;
  /** Сэдэв — сервер өгвөл (гэрээнд заавал биш) */
  topic?: string | null;
}

export type TheoryPhotoSet = TheoryDay["photos"][number];

/** GET /student-hub/theory мөр */
export interface TheoryListDay {
  classroomId: string;
  classroomName: string;
  date: string;
  topic: string | null;
  tests: string[];
  count: number;
  uploaders: string[];
  canUpload: boolean;
}

export interface HomeworkPhoto {
  id: string;
  fileKey: string;
  pages: number;
  uploadedAt: string;
}

/** «YYYY-MM-DD»-ээс n хоногийн зөрүү (цагийн бүсгүй өдөр) */
export function dayDiff(a: string, b: string): number {
  const toUtc = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(a) - toUtc(b)) / 86_400_000);
}

/** «YYYY-MM-DD» + n хоног */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function isDateKey(v: string | null | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
