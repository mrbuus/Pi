// Сурагчийн хичээлийн хуанли (эзэн 2026-11-08) — цэвэр логик (I/O-гүй), тест: student-calendar.logic.spec.ts.
//
// Хайрцаг = нэг (өдөр, анги) хос. Хаанаас үүсэх вэ:
//  1) Хуваарь (ClassSchedule − цуцалсан/зөөсөн + зөөгдөж ирсэн − амралт; week-resolver) — тэр өдөр
//     сурагч тэр ангид ЭЛССЭН байсан бол (enrolledOn).
//  2) Тэр өдөр анги тест хийсэн (ClassTestSession) — элссэн ангид л (хуваарьгүй өдөр ч хичээлтэй).
//  3) Сурагчийн өөрийн мөр — ирц, даалгавар, шалгалтын оноо, батлагдсан хичээлийн snapshot
//     (LessonRecordStudent): ЯМАР Ч ангид (анги солих өдөр хуучин ангид тэмдэглэгдсэн байж болно).
// Нэг ангид нэг өдөр хоёр хичээл бол нэг хайрцаг (хамгийн эрт эхлэл, хамгийн сүүлийн төгсгөл).
// Нөхөлт (MakeupVisit) нь тусдаа хайрцаг — энэ функцэд орохгүй.

import { resolveWeek, type ResolvedDay } from '../schedule/week-resolver';

type ResolveParams = Parameters<typeof resolveWeek>[0];

const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * [from, to] мужийг 7 хоногоор хувааж resolveWeek-ээр шийднэ (MOVED нь 7 хоногийн хил давж
 * зөөгдсөн ч зөв: эх 7 хоногоос хасагдаж, очих 7 хоногийн 2-р алхмаар нэмэгдэнэ).
 */
export function resolveRange(params: Omit<ResolveParams, 'weekStart'> & { from: string; to: string }): ResolvedDay[] {
  const { from, to, ...rest } = params;
  const out: ResolvedDay[] = [];
  for (let start = from; start <= to; start = addDays(start, 7)) {
    for (const day of resolveWeek({ ...rest, weekStart: start })) if (day.date <= to) out.push(day);
  }
  return out;
}

export interface Person {
  id: string;
  name: string;
}

export interface AttendanceIn {
  classroomId: string;
  date: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  lateRange: string | null;
  note: string | null;
  markedBy: string | null;
}
export interface HomeworkIn {
  classroomId: string;
  date: string;
  status: 'DONE' | 'PARTIAL' | 'NOT_DONE' | null;
  comment: string | null;
  markedBy: string | null;
}
export interface SessionIn {
  classroomId: string;
  date: string;
  testId: string | null;
  title: string;
  variant: string | null;
}
export interface RecordIn {
  classroomId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  room: string | null;
  topic: string | null;
  lead: string | null;
  assistant: string | null;
  description: string | null;
  problemNumbersText: string | null;
  confirmedBy: string;
  /** Тэр өдөр сурагч snapshot-д байсан (LessonRecordStudent, removedAt = null) */
  studentListed: boolean;
}
export interface QuizIn {
  classroomId: string;
  date: string;
  score: number;
  problemCount: number;
}
export interface NoteIn {
  classroomId: string;
  date: string;
  body: string;
  by: string;
}

export interface LessonDay {
  /** `${date}|${classroomId}` */
  key: string;
  date: string;
  classroomId: string;
  classroomName: string;
  /** Тэр өдөр энэ ангид элссэн байсан (өөр ангид тэмдэглэгдсэн бол false) */
  own: boolean;
  /** Хуваарь дээр байсан хичээл (тест/ирцээс л мэдэгдсэн бол false) */
  scheduled: boolean;
  startMinute: number | null;
  endMinute: number | null;
  room: string | null;
  /** Зөөгдөж ирсэн хичээлийн анхны огноо */
  movedFrom: string | null;
  /** Хуваарийн/батламжийн сэдэв */
  topic: string | null;
  lead: string | null;
  assistant: string | null;
  /** Хуваарийн үндсэн багш (өдрийн ахлах багш оноогоогүй үед) */
  scheduleTeacher: string | null;
  /** Анги тэр өдөр хийсэн тест (ClassTestSession) */
  tests: { testId: string | null; title: string; variant: string | null }[];
  confirmed: { description: string | null; problemNumbersText: string | null; by: string } | null;
  /** Багшийн тайлбар (LessonNote) — зөвхөн ажилтанд */
  teacherNote: { body: string; by: string } | null;
  attendance: Omit<AttendanceIn, 'classroomId' | 'date'> | null;
  homework: Omit<HomeworkIn, 'classroomId' | 'date'> | null;
  quiz: { score: number; problemCount: number } | null;
  future: boolean;
}

export function buildLessonDays(input: {
  from: string;
  to: string;
  today: string;
  enrolled: (classroomId: string, date: string) => boolean;
  classNames: ReadonlyMap<string, string>;
  resolved: ResolvedDay[];
  attendance: AttendanceIn[];
  homework: HomeworkIn[];
  sessions: SessionIn[];
  records: RecordIn[];
  quiz: QuizIn[];
  notes: NoteIn[];
}): LessonDay[] {
  const { from, to, today, enrolled } = input;
  const inRange = (d: string) => d >= from && d <= to;
  const days = new Map<string, LessonDay>();
  const keyOf = (date: string, classroomId: string) => `${date}|${classroomId}`;
  const ensure = (date: string, classroomId: string, fallbackName?: string): LessonDay => {
    const key = keyOf(date, classroomId);
    let d = days.get(key);
    if (!d) {
      d = {
        key,
        date,
        classroomId,
        classroomName: input.classNames.get(classroomId) ?? fallbackName ?? 'Анги',
        own: enrolled(classroomId, date),
        scheduled: false,
        startMinute: null,
        endMinute: null,
        room: null,
        movedFrom: null,
        topic: null,
        lead: null,
        assistant: null,
        scheduleTeacher: null,
        tests: [],
        confirmed: null,
        teacherNote: null,
        attendance: null,
        homework: null,
        quiz: null,
        future: date > today,
      };
      days.set(key, d);
    }
    return d;
  };

  for (const day of input.resolved) {
    if (!inRange(day.date)) continue;
    for (const e of day.entries) {
      if (!enrolled(e.classroomId, day.date)) continue;
      const d = ensure(day.date, e.classroomId, e.classroomName);
      d.scheduled = true;
      d.startMinute = d.startMinute === null ? e.startMinute : Math.min(d.startMinute, e.startMinute);
      d.endMinute = d.endMinute === null ? e.endMinute : Math.max(d.endMinute, e.endMinute);
      d.room = d.room ?? e.room;
      d.movedFrom = d.movedFrom ?? e.exception?.originalDate ?? null;
      if (e.topic) d.topic = d.topic && d.topic !== e.topic ? `${d.topic}; ${e.topic}` : e.topic;
      d.lead = d.lead ?? e.leadTeacher?.name ?? null;
      d.assistant = d.assistant ?? e.assistantTeacher?.name ?? null;
      d.scheduleTeacher = d.scheduleTeacher ?? e.teacherName ?? null;
    }
  }
  for (const s of input.sessions) {
    if (!inRange(s.date) || !enrolled(s.classroomId, s.date)) continue;
    const d = ensure(s.date, s.classroomId);
    const dup = d.tests.some((t) => (s.testId ? t.testId === s.testId : !t.testId && t.title === s.title));
    if (!dup) d.tests.push({ testId: s.testId, title: s.title, variant: s.variant });
  }
  for (const r of input.records) {
    if (!inRange(r.date)) continue;
    // Батлагдсан хичээл: сурагч snapshot-д байсан эсвэл тэр өдөр элссэн байсан ангийнх
    if (!r.studentListed && !enrolled(r.classroomId, r.date)) continue;
    const d = ensure(r.date, r.classroomId);
    d.startMinute = d.startMinute ?? r.startMinute;
    d.endMinute = d.endMinute ?? r.endMinute;
    d.room = d.room ?? r.room;
    // Батламжийн сэдэв = хийсэн тест + сэдэв (lesson-coherence) — хуваарийн сэдвийг дарна
    if (r.topic) d.topic = r.topic;
    d.lead = r.lead ?? d.lead;
    d.assistant = r.assistant ?? d.assistant;
    d.confirmed = { description: r.description, problemNumbersText: r.problemNumbersText, by: r.confirmedBy };
  }
  for (const a of input.attendance) {
    if (!inRange(a.date)) continue;
    const { classroomId: _c, date: _d, ...rest } = a;
    ensure(a.date, a.classroomId).attendance = rest;
  }
  for (const h of input.homework) {
    if (!inRange(h.date) || (!h.status && !h.comment)) continue;
    const { classroomId: _c, date: _d, ...rest } = h;
    ensure(h.date, h.classroomId).homework = rest;
  }
  for (const q of input.quiz) {
    if (!inRange(q.date)) continue;
    ensure(q.date, q.classroomId).quiz = { score: q.score, problemCount: q.problemCount };
  }
  // Тайлбар нь хайрцаг ҮҮСГЭХГҮЙ — байгаа хичээлд л хавсарна
  for (const n of input.notes) {
    const d = days.get(keyOf(n.date, n.classroomId));
    if (d) d.teacherNote = { body: n.body, by: n.by };
  }
  return [...days.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.startMinute ?? 24 * 60) - (b.startMinute ?? 24 * 60) ||
      a.classroomName.localeCompare(b.classroomName),
  );
}
