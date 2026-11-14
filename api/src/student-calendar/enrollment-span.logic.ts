// Сурагчийн ангийн түүх (Enrollment.joinedAt / leftAt) — огноогоор «тэр өдөр аль ангид байсан бэ».
// Цэвэр логик (I/O-гүй), тест: student-calendar.logic.spec.ts.
//
// Дүрэм (эзэн 2026-11-08, баримтжуулсан):
//  - Огнооны түлхүүр YYYY-MM-DD (УБ-ын өдөр — Enrollment-ийн timestamp-ыг дуудагч тал dateKey-ээр хувиргана).
//  - Анги солих өдөр (хуучны leftAt = шинийн joinedAt = X) тэр өдөр ШИНЭ ангид тооцогдоно:
//    joined <= өдөр < left. Тэр өдөр хуучин ангид ирц тэмдэглэгдсэн бол ирц нь давамгайлна
//    (дуудагч тал ирцийг тусад нь шалгадаг).

export interface EnrollmentSpan {
  classroomId: string;
  /** joinedAt-ийн өдөр */
  joined: string;
  /** leftAt-ийн өдөр; null = одоо ч энэ ангид */
  left: string | null;
}

/** Тухайн өдөр энэ ангид элссэн байсан эсэх (joined <= key < left) */
export function enrolledOn(spans: readonly EnrollmentSpan[], classroomId: string, key: string): boolean {
  return spans.some((s) => s.classroomId === classroomId && s.joined <= key && (s.left === null || key < s.left));
}

/** [from, to] мужид нэг ч өдөр элссэн байсан ангиуд */
export function classesInRange(
  spans: readonly EnrollmentSpan[],
  from: string,
  to: string,
): string[] {
  const out = new Set<string>();
  for (const s of spans) if (s.joined <= to && (s.left === null || s.left > from)) out.add(s.classroomId);
  return [...out];
}

/**
 * Одоогийн анги — хөтөлбөрийн эх: идэвхтэй (left = null) элсэлтүүдээс хамгийн сүүлд элссэн нь.
 * `preferred` (ж: танхимын анги) өгвөл тэдгээрийг түрүүлж сонгоно. Идэвхтэй элсэлтгүй бол
 * хамгийн сүүлд гарсан анги (сургалтаас хасагдсан сурагчийн түүх).
 */
export function currentClassroomOf(spans: readonly EnrollmentSpan[], preferred?: ReadonlySet<string>): string | null {
  const active = spans.filter((s) => s.left === null);
  const pool = active.length ? active : [...spans];
  if (!pool.length) return null;
  const rank = (s: EnrollmentSpan) => (preferred?.has(s.classroomId) ? 1 : 0);
  const sorted = [...pool].sort(
    (a, b) =>
      rank(b) - rank(a) ||
      (active.length ? b.joined.localeCompare(a.joined) : (b.left ?? '').localeCompare(a.left ?? '')) ||
      a.classroomId.localeCompare(b.classroomId),
  );
  return sorted[0].classroomId;
}
