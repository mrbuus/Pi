import { BadRequestException } from '@nestjs/common';

/** Багшийн тайлбарын дээд урт — UI-ийн тоолууртай ижил. */
export const NOTE_MAX = 500;

/**
 * Тайлбарыг цэвэрлэнэ. Хоосон/зөвхөн зай бол null — үйлчилгээ мөрийг УСТГАНА
 * (хоосон тайлбар хадгалахгүй, эзний дүрэм).
 */
export function normalizeNote(body: unknown): string | null {
  if (body === null || body === undefined) return null;
  if (typeof body !== 'string')
    throw new BadRequestException('Тайлбараа шалгана уу.');
  const trimmed = body.trim();
  if (!trimmed) return null;
  if (trimmed.length > NOTE_MAX)
    throw new BadRequestException(
      `Тайлбар ${NOTE_MAX} тэмдэгтээс хэтрэхгүй.`,
    );
  return trimmed;
}

/** Батлахад бичих тайлбарын дээд урт */
export const DESCRIPTION_MAX = 1000;
/** «1-12, 15, 20» бичвэрийн дээд урт, хамгийн их дугаар, жагсаалтын хэмжээ */
export const PROBLEM_TEXT_MAX = 200;
const PROBLEM_NUMBER_MAX = 999;
const PROBLEM_LIST_MAX = 500;

/** Чөлөөт бичвэрийг цэвэрлэнэ: хоосон бол null, урт бол таслана. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\r\n?/g, '\n').trim();
  return t ? t.slice(0, max) : null;
}

/**
 * Бодсон бодлогын дугаар (эзэн 2026-10-27): «1-12, 15, 20» → [1..12, 15, 20].
 * Таслал, цэгтэй таслал, зай тусгаарлагч; муж нь «-», «–», «—». Өсөхөөр,
 * давхардалгүй. Нэг ч хэсэг танигдахгүй бол null — бичвэр нь хэвээр хадгалагдана.
 */
export function parseProblemNumbers(text: string | null | undefined): number[] | null {
  if (!text) return null;
  const parts = text
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const out = new Set<number>();
  for (const part of parts) {
    const m = part.match(/^(\d{1,3})(?:[-\u2013\u2014](\d{1,3}))?$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    if (a < 1 || b < a || b > PROBLEM_NUMBER_MAX) return null;
    for (let n = a; n <= b; n++) {
      out.add(n);
      if (out.size > PROBLEM_LIST_MAX) return null;
    }
  }
  return [...out].sort((x, y) => x - y);
}

/** УБ-ын тухайн өдрийн [эхлэл, дараагийн өдрийн эхлэл) — UTC Date хэлбэрээр. */
export function ubDayBounds(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/**
 * Тухайн өдөр ангид элссэн байсан уу. Өдрийн эхлэлээс өмнө гарсан бол үгүй.
 * joinedAt-ыг зөвхөн өөр ангиас ШИЛЖСЭН сурагчид мөрдөнө: анхны элсэлт
 * (өмнө өөр ангид байгаагүй) нь системд оруулсан өдрөөр joinedAt авдаг тул
 * (2026-10-08-ны импорт) түүнээс өмнөх хичээлд ч гишүүн гэж үзнэ.
 */
export function enrolledOn(
  e: { joinedAt: Date; leftAt: Date | null; movedIn?: boolean },
  date: string,
): boolean {
  const { start, end } = ubDayBounds(date);
  if (e.leftAt && e.leftAt < start) return false;
  return !e.movedIn || e.joinedAt < end;
}

export interface SnapshotEntry {
  scheduleId: string;
  classroomId: string;
  classroomName: string;
  startMinute: number;
  endMinute: number;
  room: string | null;
  topic: string | null;
  leadTeacher: { id: string; name: string } | null;
  assistantTeacher: { id: string; name: string } | null;
}

export interface SnapshotInput {
  entry: SnapshotEntry;
  students: { id: string; name: string }[];
  attendance: { studentId: string; status: string }[];
  tests: { id: string; testId: string | null; title: string }[];
}

const PRESENT = new Set(['PRESENT', 'LATE']);
const ABSENT = new Set(['ABSENT', 'EXCUSED']);

/**
 * Батлах үеийн баримтыг нэг дор бүрдүүлнэ (I/O-гүй, тесттэй). Нэр, сэдэв,
 * тестийн нэрийг ТЕКСТ болгож хуулна — дараа нь засагдсан ч түүх өөрчлөгдөхгүй.
 */
export function buildSnapshot(input: SnapshotInput) {
  const { entry, students, attendance, tests } = input;
  const status = new Map(attendance.map((a) => [a.studentId, a.status]));
  const rows = students.map((s) => ({
    studentId: s.id,
    studentName: s.name,
    attendance: status.get(s.id) ?? null,
  }));
  return {
    record: {
      scheduleId: entry.scheduleId,
      classroomId: entry.classroomId,
      classroomName: entry.classroomName,
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
      room: entry.room,
      topic: entry.topic,
      leadTeacherId: entry.leadTeacher?.id ?? null,
      leadTeacherName: entry.leadTeacher?.name ?? null,
      assistantTeacherId: entry.assistantTeacher?.id ?? null,
      assistantTeacherName: entry.assistantTeacher?.name ?? null,
      tests: tests.map((t) => ({ id: t.id, testId: t.testId, title: t.title })),
      testCount: tests.length,
      enrolledCount: rows.length,
      presentCount: rows.filter((r) => r.attendance && PRESENT.has(r.attendance))
        .length,
      absentCount: rows.filter((r) => r.attendance && ABSENT.has(r.attendance))
        .length,
      attendanceMarked: rows.filter((r) => r.attendance).length,
    },
    students: rows,
  };
}
