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

/** Тухайн өдрийн ахлах/туслах багш (LessonStaffing) — нэр нь аль хэдийн нийлүүлэгдсэн. */
export interface ResolverStaffing {
  scheduleId: string;
  date: string;
  lead: { id: string; name: string } | null;
  assistant: { id: string; name: string } | null;
}

export interface ResolverHoliday {
  date: string;
  type: string;
  title: string;
  /** Аль ангид хамаарах вэ. Хоосон эсвэл заагаагүй = БҮХ анги. */
  classroomIds?: string[];
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
  /** Өдрийн ахлах багш — оноогоогүй бол null (UI хуваарийн үндсэн багшийг санал болгоно) */
  leadTeacher: { id: string; name: string } | null;
  assistantTeacher: { id: string; name: string } | null;
  exception: { kind: 'MOVED'; note: string | null; originalDate: string } | null;
}

/** Зөвхөн сонгосон ангид хамаарсан онцгой өдрөөр хасагдсан анги. */
export interface RestingClass {
  classroomId: string;
  classroomName: string;
  type: string;
  title: string;
}

export interface ResolvedDay {
  date: string;
  weekday: number;
  /** БҮХ ангид хамаарах онцгой өдөр байвал true (entries хасагдахгүй, тэмдэглэгдэнэ). */
  isHoliday: boolean;
  /** Бүх ангид хамаарах онцгой өдрийн мэдээлэл */
  holiday: { type: string; title: string } | null;
  /**
   * Зөвхөн зарим ангид хамаарах онцгой өдөр. Эдгээр ангийн хичээл entries-ээс
   * ХАСАГДСАН — энд л бүртгэлтэй үлдэнэ (UI «амарна» гэж харуулахад).
   */
  restingClasses: RestingClass[];
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
  staffing?: ResolverStaffing[];
}): ResolvedDay[] {
  const { weekStart, schedules, exceptions, topics, holidays } = params;
  const staffByKey = new Map(
    (params.staffing ?? []).map((st) => [`${st.scheduleId}|${st.date}`, st]),
  );
  const days = sevenDaysFrom(weekStart);
  const daySet = new Set(days);

  // Бүх ангид хамаарах (classroomIds хоосон) өдрүүд — day.isHoliday
  const holidayByDate = new Map<string, ResolverHoliday>();
  // Зарим ангид хамаарах өдрүүд: огноо -> анги -> онцгой өдөр
  const scopedByDate = new Map<string, Map<string, ResolverHoliday>>();
  for (const h of holidays) {
    if (!h.classroomIds || h.classroomIds.length === 0) {
      if (!holidayByDate.has(h.date)) holidayByDate.set(h.date, h);
      continue;
    }
    const perClass = scopedByDate.get(h.date) ?? new Map<string, ResolverHoliday>();
    for (const id of h.classroomIds) if (!perClass.has(id)) perClass.set(id, h);
    scopedByDate.set(h.date, perClass);
  }
  const topicByKey = new Map(topics.map((t) => [`${t.scheduleId}|${t.date}`, t.title]));

  // exceptions indexed by scheduleId|date(original)
  const exceptionByKey = new Map(
    exceptions.map((e) => [`${e.scheduleId}|${e.date}`, e]),
  );

  const result: ResolvedDay[] = days.map((date) => ({
    date,
    weekday: weekdayOf(date),
    isHoliday: holidayByDate.has(date),
    holiday: holidayByDate.has(date)
      ? { type: holidayByDate.get(date)!.type, title: holidayByDate.get(date)!.title }
      : null,
    restingClasses: [],
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
      leadTeacher: staffByKey.get(`${s.id}|${overrides.topicDate}`)?.lead ?? null,
      assistantTeacher:
        staffByKey.get(`${s.id}|${overrides.topicDate}`)?.assistant ?? null,
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
    // Зарим ангид хамаарах онцгой өдөр: тэр ангийн хичээлийг (зөөгдөж ирсэн
    // хичээлийг ч) өдрийн жагсаалтаас хасна.
    const scoped = scopedByDate.get(day.date);
    if (scoped) {
      const seen = new Set<string>();
      day.entries = day.entries.filter((e) => {
        const h = scoped.get(e.classroomId);
        if (!h) return true;
        if (!seen.has(e.classroomId)) {
          seen.add(e.classroomId);
          day.restingClasses.push({
            classroomId: e.classroomId,
            classroomName: e.classroomName,
            type: h.type,
            title: h.title,
          });
        }
        return false;
      });
    }
    day.entries.sort((a, b) => a.startMinute - b.startMinute);
  }

  return result;
}

export interface ResolverTeacher {
  id: string;
  name: string;
  role?: string;
}

export interface ResolverWorkDay {
  teacherId: string;
  weekday: number;
  // 0 = 7 хоног бүр (анхдагч), 1 = сондгой, 2 = тэгш 7 хоног
  parity?: number;
  sortOrder?: number;
}

export interface ResolverWorkException {
  teacherId: string;
  date: string;
  working: boolean;
}

// Төвийн багшийн хүснэгт СОНДГОЙ/ТЭГШ 7 хоногоор ээлжилдэг (эзэн 2026-10-11).
// 1-р (сондгой) 7 хоног = 2026-09-01-ний 7 хоног, Даваа 2026-08-31-ээс.
// Түүнээс өмнөх огноо ч математик modulo-гоор ижил ээлжээ үргэлжлүүлнэ.
export const PARITY_ANCHOR_MONDAY = '2026-08-31';
export const PARITY_EVERY = 0;
export const PARITY_ODD = 1;
export const PARITY_EVEN = 2;

// Хүснэгтийн горим: FIXED = 7 хоног бүр ижил (parity 0 мөр),
// ALTERNATING = сондгой/тэгш ээлж (parity 1/2 мөр). validFrom..validTo-гаас
// гадуур хүснэгт хэрэгжихгүй — зөвхөн онцгой өдөр (TeacherWorkException).
export type RosterMode = 'FIXED' | 'ALTERNATING';
export interface ResolverRosterConfig {
  mode: RosterMode;
  validFrom: string | null;
  validTo: string | null;
}
export const DEFAULT_ROSTER_CONFIG: ResolverRosterConfig = {
  mode: 'ALTERNATING',
  validFrom: null,
  validTo: null,
};

/** Огнооны 7 хоногийн ээлж: 1 = сондгой, 2 = тэгш. Даваа-Ням нэг 7 хоног. */
export function weekParityOf(dateStr: string): 1 | 2 {
  const day = Date.parse(`${dateStr}T00:00:00.000Z`);
  const anchor = Date.parse(`${PARITY_ANCHOR_MONDAY}T00:00:00.000Z`);
  const days = Math.round((day - anchor) / 86_400_000);
  const week = Math.floor(days / 7);
  return ((week % 2) + 2) % 2 === 0 ? 1 : 2;
}

// Багшийн 7 хоногийн ажлын өдрийн roster: TeacherWorkDay (давтагддаг, сондгой/
// тэгш ээлжтэй) дээр TeacherWorkException (тухайн өдрийн override)-ийг тавьж
// эцсийн жагсаалтыг хүснэгтийн мөрийн дарааллаар (sortOrder, дараа нь нэр)
// гаргана.
export function resolveTeacherRoster(params: {
  weekStart: string;
  teachers: ResolverTeacher[];
  workDays: ResolverWorkDay[];
  exceptions: ResolverWorkException[];
  config?: ResolverRosterConfig;
}): {
  date: string;
  weekday: number;
  parity: 1 | 2;
  mode: RosterMode;
  inRange: boolean;
  teachers: ResolverTeacher[];
}[] {
  const { weekStart, teachers, workDays, exceptions } = params;
  const config = params.config ?? DEFAULT_ROSTER_CONFIG;
  const days = sevenDaysFrom(weekStart);

  const workDaySet = new Set(
    workDays.map((w) => `${w.teacherId}|${w.weekday}|${w.parity ?? 0}`),
  );
  const orderOf = new Map<string, number>();
  for (const w of workDays) {
    const cur = orderOf.get(w.teacherId);
    const o = w.sortOrder ?? 0;
    if (cur === undefined || o < cur) orderOf.set(w.teacherId, o);
  }
  const ordered = [...teachers].sort(
    (a, b) =>
      (orderOf.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderOf.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
      a.name.localeCompare(b.name, 'mn'),
  );
  const exceptionByKey = new Map(
    exceptions.map((e) => [`${e.teacherId}|${e.date}`, e.working]),
  );

  return days.map((date) => {
    const weekday = weekdayOf(date);
    const parity = weekParityOf(date);
    const inRange =
      (!config.validFrom || date >= config.validFrom) &&
      (!config.validTo || date <= config.validTo);
    // Горимд таарах мөр л хэрэгжинэ: Тогтмол → parity 0, Ээлжит → тухайн 7 хоногийн
    const activeParity = config.mode === 'FIXED' ? 0 : parity;
    return {
      date,
      weekday,
      parity,
      mode: config.mode,
      inRange,
      teachers: ordered.filter((t) => {
        const exc = exceptionByKey.get(`${t.id}|${date}`);
        if (exc !== undefined) return exc;
        return inRange && workDaySet.has(`${t.id}|${weekday}|${activeParity}`);
      }),
    };
  });
}
