/**
 * "Үргэлжлүүлэх" (continue where you left off) — сурагчийн хамгийн сүүлд
 * нээсэн бүлгийг санана.
 *
 * Яагаад клиент талд (localStorage) хадгалдаг вэ: өгөгдсөн /lessons/*
 * контрактад "хамгийн сүүлд нээсэн бүлэг" гэсэн тусдаа endpoint байхгүй —
 * зөвхөн GET /lessons/chapters (жагсаалт) ба GET /lessons/:chapterId (нэг
 * бүлгийн ахиц) байна. Тиймээс "сүүлд юу үзэж байсан бэ" гэдгийг клиент
 * талд бага зэргийн best-effort санамжаар шийдэж, ахицын хувь (%)-ийг
 * ХЭЗЭЭ Ч кэшлэхгүй — зөвхөн chapterId+subject-ийг санаад, бодит хувийг
 * дараагийн ачаалалт бүрд серверээс шинээр татна (localStorage хуучирсан
 * "60%" гэх мэт буруу тоо харуулахаас сэргийлнэ).
 */

const KEY = "pi_lastLessonChapter";

export interface LastLessonRecord {
  chapterId: string;
  subject: string;
  title: string;
  bookCode?: string;
  at: number;
}

export function readLastLesson(): LastLessonRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastLessonRecord;
    if (!parsed?.chapterId || !parsed?.subject) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastLesson(record: LastLessonRecord) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    /* Storage дүүрсэн/хориглогдсон бол чимээгүй алгасна — критик функц биш */
  }
}
