// Багшийн сарын ажилласан цаг — ЦЭВЭР логик (DB-гүй, unit test-тэй).
//
// Эзний шийдвэр (2026-09-26): «Ажилтны төлбөр — зүгээр цагийг нь бодох нь
// хангалттай». Эх сурвалж нь хичээлийн хуваарь (ClassSchedule): resolveWeek
// аль хэдийн цуцалсан (CANCELLED) хичээлийг хасаж, зөөсөн (MOVED) хичээлийг
// шинэ огноо/цагт нь тавьдаг. Энд зөвхөн:
//   - тухайн сард хамаарах өдрүүдийг авна,
//   - сургалтын хуанлийн амралт/хичээлгүй өдрийг (isHoliday) хасна,
//   - багш бүрээр минутыг нэмнэ.
import { resolveWeek, type ResolvedDay } from './week-resolver';

export interface TeacherHoursRow {
  teacherId: string;
  teacherName: string;
  lessons: number;
  minutes: number;
  /** Хичээл бүр — огноо, анги, цаг (тайланд харуулах). */
  sessions: { date: string; classroomName: string; startMinute: number; endMinute: number }[];
}

/** "YYYY-MM" → тухайн сарын эхний өдөр ба өдрийн тоо (UTC). */
export function monthRange(month: string): { first: string; days: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error('month нь YYYY-MM хэлбэртэй байх ёстой');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) throw new Error('month нь YYYY-MM хэлбэртэй байх ёстой');
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { first: `${m[1]}-${m[2]}-01`, days };
}

/** Сарыг 7 хоногийн цонхнууд болгож эхлэх огноонуудыг буцаана. */
export function weekStartsOfMonth(month: string): string[] {
  const { first, days } = monthRange(month);
  const base = new Date(`${first}T00:00:00.000Z`).getTime();
  const out: string[] = [];
  for (let i = 0; i < days; i += 7) {
    out.push(new Date(base + i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

export function aggregateTeacherHours(month: string, days: ResolvedDay[]): TeacherHoursRow[] {
  const byTeacher = new Map<string, TeacherHoursRow>();
  const seen = new Set<string>(); // цонхнууд давхцвал нэг хичээлийг 2 удаа тоолохгүй
  for (const day of days) {
    if (!day.date.startsWith(`${month}-`) || day.isHoliday) continue;
    for (const e of day.entries) {
      if (!e.teacherId) continue;
      const key = `${e.scheduleId}|${day.date}|${e.startMinute}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const minutes = Math.max(0, e.endMinute - e.startMinute);
      const row =
        byTeacher.get(e.teacherId) ??
        { teacherId: e.teacherId, teacherName: e.teacherName ?? '', lessons: 0, minutes: 0, sessions: [] };
      row.lessons += 1;
      row.minutes += minutes;
      row.sessions.push({
        date: day.date,
        classroomName: e.classroomName,
        startMinute: e.startMinute,
        endMinute: e.endMinute,
      });
      byTeacher.set(e.teacherId, row);
    }
  }
  const rows = [...byTeacher.values()];
  for (const r of rows) r.sessions.sort((a, b) => (a.date + a.startMinute).localeCompare(b.date + b.startMinute));
  return rows.sort((a, b) => b.minutes - a.minutes || a.teacherName.localeCompare(b.teacherName));
}

/** resolveWeek-ийг сарын бүх цонхонд ажиллуулаад нэгтгэнэ. */
export function computeTeacherHours(
  month: string,
  input: Omit<Parameters<typeof resolveWeek>[0], 'weekStart'>,
): TeacherHoursRow[] {
  const days = weekStartsOfMonth(month).flatMap((weekStart) => resolveWeek({ ...input, weekStart }));
  return aggregateTeacherHours(month, days);
}
