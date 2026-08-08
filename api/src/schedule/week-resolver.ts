// Долоо хоногийн харагдац (GET /schedule/week) шийдвэрлэх ЦЭВЭР логик — DB-ээс
// тусгаарлаж unit test бичихийн тулд тусдаа файлд гаргасан (grading.ts-ийн
// адилхан конвенц).

export interface ResolverSchedule {
  id: string;
  classroomId: string;
  classroomName: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  teacherId: string | null;
  teacherName: string | null;
  room: string | null;
  subject: string | null;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null; // YYYY-MM-DD
}

export interface ResolverException {
  scheduleId: string;
  date: string; // анхны (хуучин) огноо — YYYY-MM-DD
  kind: 'CANCELLED' | 'MOVED';
  newDate: string | null;
  newStartMinute: number | null;
  newEndMinute: number | null;
  newRoom: string | null;
  note: string | null;
}

export interface ResolverTopic {
  scheduleId: string;
  date: string; // YYYY-MM-DD — тухайн тохиолдлын (шинэ огноо шилжсэн бол шинэ) огноо
  title: string;
}

export interface ResolverHoliday {
  date: string;
  type: string;
  title: string;
}

export interface ResolvedEntry {
  scheduleId: string;
  classroomId: string;
  classroomName: string;
  teacherId: string | null;
  teacherName: string | null;
  startMinute: number;
  endMinute: number;
  room: string | null;
  subject: string | null;
  topic: string | null;
  exception: { kind: 'MOVED'; note: string | null; originalDate: string } | null;
}

export interface ResolvedDay {
  date: string;
  weekday: number;
  isHoliday: boolean;
  entries: ResolvedEntry[];
}

// [start, start+6] хооронд 7 огнооны string массив үүсгэнэ (UTC-safe, YYYY-MM-DD
// оролт хүлээнэ).
export function sevenDaysFrom(start: string): string[] {
  const base = new Date(`${start}T00:00:00.000Z`);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + i * 86_400_000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
}

// Тухайн schedule нь өгөгдсөн огноон дээр идэвхтэй (effectiveFrom/effectiveTo
// хооронд) мөн тухайн өдрийн долоо хоногийн хэв маягтай таарч байгаа эсэх.
export function isScheduleActiveOn(s: ResolverSchedule, dateStr: string): boolean {
  if (s.weekday !== weekdayOf(dateStr)) return false;
  if (s.effectiveFrom > dateStr) return false;
  if (s.effectiveTo && s.effectiveTo < dateStr) return false;
  return true;
}

// Долоо хоногийг [start..start+6] бүрэн тор болгон шийднэ:
//  1) 7 хоногт багтах бүх боломжит анхны тохиолдол (occurrence) олно
//     (schedule.effectiveFrom/effectiveTo-оор шүүнэ)
//  2) CANCELLED exception-той тохиолдлыг хасна
//  3) MOVED exception-той тохиолдлыг шинэ огноо/цаг руу нь зөөнө (шинэ огноо
//     7 хоногийн цонхны гадна байж болно — тэгвэл зөвхөн эх талаас нь хасна)
//  4) 7 хоногийн цонхны АЛЬ Ч өдөр рүү өөр долоо хоногоос MOVED орж ирж болно —
//     үүнийг schedule бүрийн бүх боломжит эх огноог (7 хоног хүрээнд биш,
//     ерөнхий) шалгах шаардлагагүй тул дуудагч тал moved-in occurrences-ийг
//     тусад нь дамжуулна.
//  5) topic, holiday flag-ыг нэмнэ
export function resolveWeek(params: {
  weekStart: string; // YYYY-MM-DD
  schedules: ResolverSchedule[];
  exceptions: ResolverException[]; // зөвхөн эдгээр schedule-үүдтэй холбоотой, ямар ч огнооны
  topics: ResolverTopic[];
  holidays: ResolverHoliday[];
}): ResolvedDay[] {
  const { weekStart, schedules, exceptions, topics, holidays } = params;
  const days = sevenDaysFrom(weekStart);
  const daySet = new Set(days);

  const holidayByDate = new Map(holidays.map((h) => [h.date, h]));
  const topicByKey = new Map(topics.map((t) => [`${t.scheduleId}|${t.date}`, t.title]));

  // exceptions indexed by scheduleId|date(original)
  const exceptionByKey = new Map(
    exceptions.map((e) => [`${e.scheduleId}|${e.date}`, e]),
  );

  const result: ResolvedDay[] = days.map((date) => ({
    date,
    weekday: weekdayOf(date),
    isHoliday: holidayByDate.has(date),
    entries: [],
  }));
  const resultByDate = new Map(result.map((d) => [d.date, d]));

  const pushEntry = (
    date: string,
    s: ResolverSchedule,
    overrides: {
      startMinute: number;
      endMinute: number;
      room: string | null;
      exception: ResolvedEntry['exception'];
      topicDate: string;
    },
  ) => {
    const day = resultByDate.get(date);
    if (!day) return;
    day.entries.push({
      scheduleId: s.id,
      classroomId: s.classroomId,
      classroomName: s.classroomName,
      teacherId: s.teacherId,
      teacherName: s.teacherName,
      startMinute: overrides.startMinute,
      endMinute: overrides.endMinute,
      room: overrides.room,
      subject: s.subject,
      topic: topicByKey.get(`${s.id}|${overrides.topicDate}`) ?? null,
      exception: overrides.exception,
    });
  };

  for (const s of schedules) {
    // 1) Энэ 7 хоногт байгаа анхны (natural) тохиолдлууд
    for (const date of days) {
      if (!isScheduleActiveOn(s, date)) continue;
      const exc = exceptionByKey.get(`${s.id}|${date}`);
      if (!exc) {
        pushEntry(date, s, {
          startMinute: s.startMinute,
          endMinute: s.endMinute,
          room: s.room,
          exception: null,
          topicDate: date,
        });
        continue;
      }
      if (exc.kind === 'CANCELLED') {
        continue; // энэ тохиолдол алга болно
      }
      // MOVED — шинэ огноо/цаг/танхим руу зөөнө.
      //
      // ⚠️ newDate ХООСОН байж болно (2026-08-09-нд зассан): зөвхөн цаг эсвэл
      // танхимыг нь ИЖИЛ өдөрт нь сольсон MOVED exception-д newDate ирдэггүй.
      // Өмнө нь `if (exc.newDate && ...)` байснаас ийм тохиолдол ХОЁР салбарын
      // алинд ч орохгүй, хичээл долоо хоногоос БҮРМӨСӨН алга болдог байв —
      // «Танхим солих» болон «Зөөх»-өөр зөвхөн цаг солиход хоёуланд нь илэрсэн.
      // Үр дүнтэй огноо = newDate байвал тэр, үгүй бол эх огноо нь.
      {
        const effectiveDate = exc.newDate ?? exc.date;
        if (daySet.has(effectiveDate)) {
          pushEntry(effectiveDate, s, {
            startMinute: exc.newStartMinute ?? s.startMinute,
            endMinute: exc.newEndMinute ?? s.endMinute,
            room: exc.newRoom ?? s.room,
            exception: { kind: 'MOVED', note: exc.note, originalDate: exc.date },
            topicDate: exc.date,
          });
        }
        // Үр дүнтэй огноо 7 хоногийн гадна бол энэ цонход юу ч харагдахгүй.
      }
    }

    // 2) Өөр долоо хоногоос ЭНЭ 7 хоног руу MOVED орж ирсэн тохиолдлууд —
    // эх огноо нь энэ цонхны гадна байсан ч шинэ огноо нь цонхонд байвал
    // харуулна. Дээрх давталтад эх өдөр өөрөө цонхны дотор байсан
    // тохиолдлыг аль хэдийн боловсруулсан тул давхардахгүйн тулд
    // exc.date daySet-д байхгүй тохиолдлыг л энд авна.
    for (const exc of exceptions) {
      if (exc.scheduleId !== s.id) continue;
      if (exc.kind !== 'MOVED') continue;
      if (!exc.newDate || !daySet.has(exc.newDate)) continue;
      if (daySet.has(exc.date)) continue; // дээр аль хэдийн боловсруулсан
      pushEntry(exc.newDate, s, {
        startMinute: exc.newStartMinute ?? s.startMinute,
        endMinute: exc.newEndMinute ?? s.endMinute,
        room: exc.newRoom ?? s.room,
        exception: { kind: 'MOVED', note: exc.note, originalDate: exc.date },
        topicDate: exc.date,
      });
    }
  }

  for (const day of result) {
    day.entries.sort((a, b) => a.startMinute - b.startMinute);
  }

  return result;
}

export interface ResolverTeacher {
  id: string;
  name: string;
}

export interface ResolverWorkDay {
  teacherId: string;
  weekday: number;
}

export interface ResolverWorkException {
  teacherId: string;
  date: string;
  working: boolean;
}

// Багшийн 7 хоногийн ажлын өдрийн roster: TeacherWorkDay (давтагддаг) дээр
// TeacherWorkException (тухайн өдрийн override)-ийг тавьж эцсийн жагсаалтыг
// гаргана.
export function resolveTeacherRoster(params: {
  weekStart: string;
  teachers: ResolverTeacher[];
  workDays: ResolverWorkDay[];
  exceptions: ResolverWorkException[];
}): { date: string; weekday: number; teachers: ResolverTeacher[] }[] {
  const { weekStart, teachers, workDays, exceptions } = params;
  const teacherById = new Map(teachers.map((t) => [t.id, t]));
  const days = sevenDaysFrom(weekStart);

  const workDaySet = new Set(workDays.map((w) => `${w.teacherId}|${w.weekday}`));
  const exceptionByKey = new Map(
    exceptions.map((e) => [`${e.teacherId}|${e.date}`, e.working]),
  );

  return days.map((date) => {
    const weekday = weekdayOf(date);
    const workingTeacherIds = teachers
      .map((t) => t.id)
      .filter((teacherId) => {
        const exc = exceptionByKey.get(`${teacherId}|${date}`);
        if (exc !== undefined) return exc;
        return workDaySet.has(`${teacherId}|${weekday}`);
      });
    return {
      date,
      weekday,
      teachers: workingTeacherIds
        .map((id) => teacherById.get(id))
        .filter((t): t is ResolverTeacher => !!t),
    };
  });
}
