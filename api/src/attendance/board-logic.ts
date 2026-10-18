// Ирц ба даалгаврын самбарын ЦЭВЭР логик (эзэн 2026-10-18, docs/v2/UDRIIN-HICHEEL-REWORK.md).
// ӨС-гүй — unit тестэд бүрэн ордог (board-logic.spec.ts).

/* ───────── Шалгуур (Classroom.riskCriteria) ───────── */

export interface RiskCriteria {
  /** Сүүлийн хэдэн хоногийг харах */
  windowDays: number;
  /** Ирцийн хувь үүнээс бага бол (чөлөөтэйг тооцохгүй) */
  minAttendance: number;
  /** Тасалсан тоо үүнээс их буюу тэнцүү бол */
  maxAbsences: number;
  /** Хоцорсон тоо үүнээс их буюу тэнцүү бол */
  maxLates: number;
  /** Даалгаврын хувь үүнээс бага бол (дутуу = хагас) */
  minHomework: number;
  /** Дараалан хийгээгүй тоо үүнээс их буюу тэнцүү бол */
  missingStreak: number;
}

export const DEFAULT_CRITERIA: RiskCriteria = {
  windowDays: 30,
  minAttendance: 80,
  maxAbsences: 3,
  maxLates: 4,
  minHomework: 60,
  missingStreak: 2,
};

export const CRITERIA_WINDOWS = [7, 14, 30, 60, 90] as const;

/** Талбар бүрийн зөвшөөрөгдөх муж (вэбийн CriteriaButton-тэй ижил) */
export const CRITERIA_LIMITS: Record<
  Exclude<keyof RiskCriteria, 'windowDays'>,
  { min: number; max: number; step: number }
> = {
  minAttendance: { min: 50, max: 100, step: 5 },
  maxAbsences: { min: 1, max: 10, step: 1 },
  maxLates: { min: 1, max: 10, step: 1 },
  minHomework: { min: 0, max: 100, step: 5 },
  missingStreak: { min: 1, max: 6, step: 1 },
};

/** Хувь бодохын өмнө хамгийн багадаа хэдэн тэмдэглэгээ байх (цөөн өгөгдлөөр «улаан» болгохгүй) */
export const MIN_SAMPLE = 3;

function validNumber(key: keyof RiskCriteria, v: unknown): boolean {
  if (typeof v !== 'number' || !Number.isInteger(v)) return false;
  if (key === 'windowDays')
    return (CRITERIA_WINDOWS as readonly number[]).includes(v);
  const lim = CRITERIA_LIMITS[key];
  return v >= lim.min && v <= lim.max && (v - lim.min) % lim.step === 0;
}

/** ӨС-ийн JSON → бүрэн шалгуур (буруу/дутуу талбар анхдагчаар) */
export function normalizeCriteria(raw: unknown): RiskCriteria {
  const out = { ...DEFAULT_CRITERIA };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_CRITERIA) as (keyof RiskCriteria)[]) {
    if (validNumber(key, obj[key])) out[key] = obj[key] as number;
  }
  return out;
}

/** Хадгалах утга: буруу бол алдааны мессеж, анхдагчтай тэнцүү бол null (мөр цэвэр) */
export function criteriaToStore(
  input: Record<string, unknown>,
): { ok: true; value: RiskCriteria | null } | { ok: false; error: string } {
  const out = {} as RiskCriteria;
  for (const key of Object.keys(DEFAULT_CRITERIA) as (keyof RiskCriteria)[]) {
    if (!validNumber(key, input[key]))
      return { ok: false, error: `Шалгуурын утга буруу: ${key}` };
    out[key] = input[key] as number;
  }
  const same = (Object.keys(DEFAULT_CRITERIA) as (keyof RiskCriteria)[]).every(
    (k) => out[k] === DEFAULT_CRITERIA[k],
  );
  return { ok: true, value: same ? null : out };
}

/* ───────── Эрсдэл: шалгуур хангаагүй зүйлс ───────── */

export type RiskKind = 'attendance' | 'absences' | 'lates' | 'homework' | 'streak';
export interface RiskFlag {
  kind: RiskKind;
  /** Богино тайлбар: «Ирц 72%», «3 удаа тасалсан» */
  label: string;
}

export interface AttRow {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
}
export interface HwRow {
  studentId: string;
  date: string;
  status: 'DONE' | 'PARTIAL' | 'NOT_DONE' | null;
}

/**
 * Сурагч бүрийн шалгуур хангаагүй зүйлс. Мөрүүдийг дуудагч цонхоор
 * ([upTo − windowDays, upTo]) аль хэдийн шүүсэн байна. Хоосон жагсаалт = асуудалгүй.
 * Хувийг MIN_SAMPLE-аас цөөн тэмдэглэгээтэй үед бодохгүй — «цөөхөн хүүхэд улаан» (эзэн).
 */
export function computeRisk(
  studentIds: string[],
  att: AttRow[],
  hw: HwRow[],
  c: RiskCriteria,
): Record<string, RiskFlag[]> {
  const tally = new Map<
    string,
    { present: number; late: number; absent: number; done: number; partial: number; missing: number; hw: HwRow[] }
  >();
  const get = (id: string) => {
    let t = tally.get(id);
    if (!t) {
      t = { present: 0, late: 0, absent: 0, done: 0, partial: 0, missing: 0, hw: [] };
      tally.set(id, t);
    }
    return t;
  };
  for (const r of att) {
    const t = get(r.studentId);
    if (r.status === 'PRESENT') t.present++;
    else if (r.status === 'LATE') t.late++;
    else if (r.status === 'ABSENT') t.absent++;
  }
  for (const r of hw) {
    if (!r.status) continue;
    const t = get(r.studentId);
    if (r.status === 'DONE') t.done++;
    else if (r.status === 'PARTIAL') t.partial++;
    else t.missing++;
    t.hw.push(r);
  }

  const out: Record<string, RiskFlag[]> = {};
  for (const id of studentIds) {
    const t = tally.get(id);
    const flags: RiskFlag[] = [];
    if (t) {
      const attDen = t.present + t.late + t.absent;
      if (attDen >= MIN_SAMPLE) {
        const pct = Math.round(((t.present + t.late) / attDen) * 100);
        if (pct < c.minAttendance)
          flags.push({ kind: 'attendance', label: `Ирц ${pct}%` });
      }
      if (t.absent >= c.maxAbsences)
        flags.push({ kind: 'absences', label: `${t.absent} удаа тасалсан` });
      if (t.late >= c.maxLates)
        flags.push({ kind: 'lates', label: `${t.late} удаа хоцорсон` });
      const hwDen = t.done + t.partial + t.missing;
      if (hwDen >= MIN_SAMPLE) {
        const pct = Math.round(((t.done + t.partial * 0.5) / hwDen) * 100);
        if (pct < c.minHomework)
          flags.push({ kind: 'homework', label: `Даалгавар ${pct}%` });
      }
      // Хамгийн сүүлийн тэмдэглэгдсэн даалгавраас хойш дараалсан «хийгээгүй»
      let streak = 0;
      for (const r of [...t.hw].sort((a, b) => (a.date < b.date ? 1 : -1))) {
        if (r.status === 'NOT_DONE') streak++;
        else break;
      }
      if (streak >= c.missingStreak)
        flags.push({ kind: 'streak', label: `${streak} удаа дараалан хийгээгүй` });
    }
    out[id] = flags;
  }
  return out;
}

/* ───────── Огноо ───────── */

export function addDaysKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ───────── Өмнөх хичээлийн өдөр (гэрийн даалгаврын онлайн дүнд) ───────── */

export interface LessonPattern {
  id: string;
  weekday: number; // 0 = Ням (JS)
  effectiveFrom: string;
  effectiveTo: string | null;
}
export interface LessonException {
  scheduleId: string;
  date: string;
  kind: 'CANCELLED' | 'MOVED';
  newDate: string | null;
}

/**
 * `date`-ээс ӨМНӨХ хамгийн сүүлийн хичээлтэй өдөр: хуваарийн давталт − цуцалсан/зөөсөн
 * + зөөгдөж ирсэн − амралтын өдөр; тест хийсэн (ClassTestSession) өдөр ч хичээлтэйд тооцогдоно.
 * Хуваарьгүй ангид хамгийн сүүлийн тест хийсэн өдөр. Олдохгүй бол null.
 */
export function previousLessonDate(input: {
  date: string;
  patterns: LessonPattern[];
  exceptions: LessonException[];
  holidays: string[];
  sessionDates: string[];
  lookbackDays?: number;
}): string | null {
  const { date, patterns, exceptions, holidays, sessionDates } = input;
  const lookback = input.lookbackDays ?? 28;
  const sessions = new Set(sessionDates);
  const holiday = new Set(holidays);
  const removed = new Set(
    exceptions.map((e) => `${e.scheduleId}|${e.date}`),
  );
  const movedIn = new Set(
    exceptions.filter((e) => e.kind === 'MOVED' && e.newDate).map((e) => e.newDate as string),
  );
  for (let i = 1; i <= lookback; i++) {
    const k = addDaysKey(date, -i);
    if (sessions.has(k)) return k;
    if (holiday.has(k)) continue;
    const wd = new Date(`${k}T00:00:00.000Z`).getUTCDay();
    const scheduled = patterns.some(
      (p) =>
        p.weekday === wd &&
        p.effectiveFrom <= k &&
        (!p.effectiveTo || p.effectiveTo >= k) &&
        !removed.has(`${p.id}|${k}`),
    );
    if (scheduled || movedIn.has(k)) return k;
  }
  const earlier = sessionDates.filter((d) => d < date).sort();
  return earlier.length ? earlier[earlier.length - 1] : null;
}

/* ───────── Гэрийн даалгаврын тест = ангид хийсэн тестийн нөгөө хувилбар ───────── */

/** Кирилл «А/В»-г латин болгоно (ӨС-д нэг «А» бий) */
export function normalizeVariant(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim().toUpperCase();
  if (t === 'А') return 'A';
  if (t === 'В' || t === 'Б') return 'B';
  return t;
}

export interface VariantTest {
  id: string;
  groupKey: string | null;
  variantLabel: string | null;
}

/**
 * Ангид хийсэн тест бүрийн гэрийн даалгаврын хувилбар: A хийсэн бол B (эзэн: «B-variant
 * siblings»), B хийсэн бол A. groupKey-гүй тест, хувилбаргүй бүлэг алгасагдана.
 * Буцаах: [{ fromTestId, testId }] — давхардалгүй, ангийн тестийн дарааллаар.
 */
export function homeworkVariants(
  done: VariantTest[],
  siblings: VariantTest[],
): { fromTestId: string; testId: string }[] {
  const out: { fromTestId: string; testId: string }[] = [];
  const seen = new Set<string>();
  const doneIds = new Set(done.map((t) => t.id));
  for (const t of done) {
    if (!t.groupKey) continue;
    const mine = normalizeVariant(t.variantLabel);
    const want = mine === 'B' ? 'A' : 'B';
    const hit = siblings.find(
      (s) =>
        s.groupKey === t.groupKey &&
        s.id !== t.id &&
        !doneIds.has(s.id) &&
        normalizeVariant(s.variantLabel) === want,
    );
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id);
      out.push({ fromTestId: t.id, testId: hit.id });
    }
  }
  return out;
}

/* ───────── «Илгээсэн»: тухайн хичээлийн даалгаврыг илгээсэн сурагч (эзэн 2026-10-18) ───────── */

const UB_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Timestamp → Улаанбаатарын «YYYY-MM-DD» */
export function ubDateKey(d: Date): string {
  return new Date(d.getTime() + UB_OFFSET_MS).toISOString().slice(0, 10);
}

export interface LessonAssignment {
  id: string;
  dueDate: Date | null;
  createdAt: Date;
}

/**
 * Хичээлийн (D өдрийн) даалгавар: хугацаа нь D (УБ) байгаа даалгаврууд; байхгүй бол ӨМНӨХ
 * хичээлийн өдөр (тэр өдөр орно) — D-ээс өмнө үүсгэсэн даалгаврууд (хугацаа нь D-ээс хойш
 * тавигдсаныг — ирээдүйн хичээлийнх — тооцохгүй). Өмнөх хичээл тодорхойгүй бол сүүлийн 7 хоног.
 */
export function lessonAssignmentIds(
  list: LessonAssignment[],
  date: string,
  previous: string | null,
): string[] {
  const due = list.filter((a) => a.dueDate && ubDateKey(a.dueDate) === date);
  if (due.length) return due.map((a) => a.id);
  const lower = previous ?? addDaysKey(date, -7);
  return list
    .filter((a) => {
      const created = ubDateKey(a.createdAt);
      // [өмнөх хичээлийн өдөр, D): даалгаврыг ихэвчлэн өмнөх хичээл дээр өгдөг тул тэр
      // өдөр ОРНО; D өдөр үүсгэсэн нь дараагийн хичээлийнх (хугацаа нь D бол дээр баригдсан).
      if (created < lower || created >= date) return false;
      return !a.dueDate || ubDateKey(a.dueDate) <= date;
    })
    .map((a) => a.id);
}

/** Илгээсэн = submittedAt бөглөгдсөн эсвэл зурагтай; одоо ангид байгаа сурагч, давхардалгүй */
export function submittedStudentIds(
  subs: { studentId: string; submittedAt: Date | null; imageKeys: string[] }[],
  enrolled: string[],
): string[] {
  const active = new Set(enrolled);
  const out = new Set<string>();
  for (const s of subs) {
    if (!active.has(s.studentId)) continue;
    if (s.submittedAt || s.imageKeys.length > 0) out.add(s.studentId);
  }
  return [...out];
}
