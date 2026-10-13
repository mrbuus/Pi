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
