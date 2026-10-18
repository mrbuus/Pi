/**
 * «Анхаарах сурагч» — бүртгэлтэй ч ангид хуваарилагдаагүй, эсвэл ангид байгаа ч
 * хичээлдээ ирэхгүй байгаа хүүхэд (эзэн 2026-10-18: «бүртгэлтэй атал ирэхгүй
 * байх нь том алдаа»). Цэвэр тооцоо (I/O-гүй) — attention.spec.ts.
 *
 * Хуурамч дохио өгөхгүйн тулд: ангид тэмдэглэгдсэн хичээл (сурагчийн нэгдсэн
 * өдрөөс хойш) 2-оос цөөн бол ХЭЗЭЭ Ч дохиолохгүй.
 */

/** Анги дахь хамгийн бага тэмдэглэгдсэн хичээл — үүнээс доош бол дохиолохгүй */
export const MIN_MARKED_LESSONS = 2;
/** «Ирэхгүй» гэж үзэхийн тулд сүүлийн хэдэн тэмдэглэгдсэн хичээлд ирээгүй байх */
export const RECENT_LESSONS = 3;

export interface AttentionEnrollment {
  studentId: string;
  classroomId: string;
  /** Ангид нэгдсэн өдөр (УБ, YYYY-MM-DD) */
  start: string;
}

export interface AttentionMark {
  classroomId: string;
  studentId: string;
  /** YYYY-MM-DD */
  date: string;
  status: string;
}

export interface NotAttendingHit {
  studentId: string;
  classroomId: string;
  /** Ангид хамгийн сүүлд ирсэн өдөр (байхгүй бол null) */
  lastAttended: string | null;
  /** Нэгдсэнээс хойших тэмдэглэгдсэн хичээлээс ирээгүй тоо */
  missedCount: number;
}

const attended = (status: string) => status === 'PRESENT' || status === 'LATE';

export function findNotAttending(
  enrollments: AttentionEnrollment[],
  marks: AttentionMark[],
): NotAttendingHit[] {
  // анги → тэмдэглэгдсэн өдрүүд (хэнд ч), сурагч → ирсэн өдрүүд
  const lessonDates = new Map<string, Set<string>>();
  const present = new Map<string, Set<string>>();
  for (const m of marks) {
    (lessonDates.get(m.classroomId) ?? lessonDates.set(m.classroomId, new Set()).get(m.classroomId)!).add(m.date);
    if (!attended(m.status)) continue;
    const key = `${m.classroomId}|${m.studentId}`;
    (present.get(key) ?? present.set(key, new Set()).get(key)!).add(m.date);
  }
  const hits: NotAttendingHit[] = [];
  for (const e of enrollments) {
    const lessons = [...(lessonDates.get(e.classroomId) ?? [])]
      .filter((d) => d >= e.start)
      .sort()
      .reverse();
    if (lessons.length < MIN_MARKED_LESSONS) continue;
    const came = present.get(`${e.classroomId}|${e.studentId}`) ?? new Set<string>();
    if (lessons.slice(0, RECENT_LESSONS).some((d) => came.has(d))) continue;
    const last = [...came].sort().at(-1) ?? null;
    hits.push({
      studentId: e.studentId,
      classroomId: e.classroomId,
      lastAttended: last,
      missedCount: lessons.filter((d) => !came.has(d)).length,
    });
  }
  return hits;
}
