// Багшийн ажилласан цагийн хүснэгт (эзэн 2026-11-08) — ЦЭВЭР логик, DB-гүй, тесттэй.
//
// Эзний Excel «Цаг.xlsx»-ийн веб хувилбар: мөр = багш (ажлын өдрийн хүснэгтийн
// дарааллаар), багана = хагас сарын өдөр (1–15, 16–сарын сүүл), нүд = цаг.
// Багшид сард ХОЁР удаа цалин олгодог тул үе = хагас сар.
//
// Цагийг БҮХЭЛ ТОО «цагийн зуутын нэг» (hundredths) хэлбэрээр хадгалж нэмнэ:
// 7.5 цаг = 750. Бутархай тоог (0.1 + 0.2) нэмэхэд гардаг хөвөгч цэгийн алдаа
// нийлбэрт хэзээ ч орохгүй.
import type { ResolvedDay } from '../schedule/week-resolver';

/* ------------------------------------------------------------------ Үе */

export interface HalfMonthPeriod {
  /** «2026-11-1» (1–15) эсвэл «2026-11-2» (16–сарын сүүл) */
  id: string;
  year: number;
  month: number;
  half: 1 | 2;
  /** Эхний өдөр «YYYY-MM-DD» */
  start: string;
  /** Сүүлийн өдөр «YYYY-MM-DD» (оролцоно) */
  end: string;
  /** Үеийн бүх өдөр дарааллаар */
  days: string[];
}

const PERIOD_RE = /^(\d{4})-(\d{2})-([12])$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Сарын өдрийн тоо (UTC-ээр, өндөр жилийн 2-р сар = 29). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** «2026-11-2» → үеийн бүтэн мэдээлэл. Буруу бол Error. */
export function parsePeriod(id: string): HalfMonthPeriod {
  const m = PERIOD_RE.exec(id ?? '');
  if (!m) throw new Error('Үе «YYYY-MM-1» эсвэл «YYYY-MM-2» хэлбэртэй байна');
  const year = Number(m[1]);
  const month = Number(m[2]);
  const half = Number(m[3]) as 1 | 2;
  if (month < 1 || month > 12 || year < 2020 || year > 2100)
    throw new Error('Үе «YYYY-MM-1» эсвэл «YYYY-MM-2» хэлбэртэй байна');
  const first = half === 1 ? 1 : 16;
  const last = half === 1 ? 15 : daysInMonth(year, month);
  const ym = `${year}-${pad2(month)}`;
  const days: string[] = [];
  for (let d = first; d <= last; d++) days.push(`${ym}-${pad2(d)}`);
  return {
    id: `${ym}-${half}`,
    year,
    month,
    half,
    start: days[0],
    end: days[days.length - 1],
    days,
  };
}

/** «2026-11-20» → «2026-11-2». */
export function periodOfDate(date: string): string {
  const m = DATE_RE.exec(date ?? '');
  if (!m) throw new Error('Огноо «YYYY-MM-DD» хэлбэртэй байна');
  return `${m[1]}-${m[2]}-${Number(m[3]) <= 15 ? 1 : 2}`;
}

/** Үеийг delta-аар шилжүүлнэ (−1 = өмнөх хагас сар). */
export function shiftPeriod(id: string, delta: number): string {
  const p = parsePeriod(id);
  // Хагас сарыг тасралтгүй индекс болгоно: жил×24 + (сар−1)×2 + (хагас−1)
  const index = p.year * 24 + (p.month - 1) * 2 + (p.half - 1) + delta;
  const year = Math.floor(index / 24);
  const rest = index - year * 24;
  const month = Math.floor(rest / 2) + 1;
  const half = (rest % 2) + 1;
  return `${year}-${pad2(month)}-${half}`;
}

/** a < b бол сөрөг, тэнцүү бол 0 (үеийг цаг хугацаагаар харьцуулна). */
export function comparePeriods(a: string, b: string): number {
  return parsePeriod(a).start.localeCompare(parsePeriod(b).start);
}

/** Огноо үед хамаарах эсэх. */
export function isDateInPeriod(date: string, period: HalfMonthPeriod): boolean {
  return date >= period.start && date <= period.end;
}

/* ------------------------------------------------------------ Цагийн утга */

export type HoursParse =
  | { ok: true; hundredths: number | null }
  | { ok: false; error: string };

export const MAX_HOURS_PER_DAY = 24;

/**
 * Нүдэнд бичсэн утгыг уншина. Аравтын тэмдэг цэг ч, таслал ч болно
 * («7.5», «7,5»); хоосон = нүдийг арилгах (null). 0–24, бутархай 2 орон хүртэл
 * (0.25 = 15 минут). Хөвөгч цэгийн тоо ашиглахгүй — бүхэл ба бутархай хэсгийг
 * тусад нь уншина.
 */
export function parseHoursInput(raw: string | number | null | undefined): HoursParse {
  if (raw === null || raw === undefined) return { ok: true, hundredths: null };
  const text = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
  if (text === '') return { ok: true, hundredths: null };
  const m = /^(\d{0,2})(?:\.(\d*))?$/.exec(text);
  if (!m || (m[1] === '' && !m[2]))
    return { ok: false, error: 'Зөвхөн тоо бичнэ үү (ж: 7 эсвэл 7,5)' };
  const frac = m[2] ?? '';
  if (frac.length > 2) return { ok: false, error: 'Бутархай нь 2 оронгоос ихгүй (ж: 7,25)' };
  const hundredths = Number(m[1] || '0') * 100 + Number(frac.padEnd(2, '0'));
  if (hundredths > MAX_HOURS_PER_DAY * 100)
    return { ok: false, error: 'Нэг өдөрт 0–24 цаг' };
  return { ok: true, hundredths };
}

/** 750 → «7.5», 725 → «7.25», 700 → «7», null → «». Таслалгүй (машинд уншигдах). */
export function formatHundredths(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Math.round(value));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  if (frac === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${pad2(frac).replace(/0$/, '')}`;
}

/** Бүхэл тоонуудын нийлбэр — null-ыг алгасна. */
export function sumHundredths(values: Iterable<number | null | undefined>): number {
  let total = 0;
  for (const v of values) if (typeof v === 'number') total += v;
  return total;
}

/* -------------------------------------------------------------- Цалин */

/** Цаг × хөлс (₮/цаг) — төгрөгөөр бүхэлчилнэ. */
export function payAmount(hundredths: number, ratePerHour: number): number {
  return Math.round((hundredths * ratePerHour) / 100);
}

export interface PayRateRow {
  /** Үеийн эхний өдөр «YYYY-MM-DD» — тэр үеэс эхлэн хэрэгжинэ */
  effectiveFrom: string;
  ratePerHour: number;
}

/**
 * Тухайн үед хэрэгжих хөлс: эхлэх огноо нь үеийн эхнээс ХЭТРЭЭГҮЙ хамгийн
 * сүүлийн мөр. Хөлсийг нэг үед тавибал дараагийн үеүүдэд өвлөгдөнө, өмнөх
 * үеийн тооцоо өөрчлөгдөхгүй.
 */
export function effectiveRate(rows: PayRateRow[], periodStart: string): PayRateRow | null {
  let best: PayRateRow | null = null;
  for (const r of rows)
    if (r.effectiveFrom <= periodStart && (!best || r.effectiveFrom > best.effectiveFrom)) best = r;
  return best;
}

/** Хөлсний утгыг шалгана: бүхэл төгрөг, 0–1 000 000. */
export function validRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1_000_000;
}

/* ------------------------------------------------------------- Данс */

export type AccountParse = { ok: true; value: string } | { ok: false; error: string };

/**
 * Дансны дугаар: зай, зураасыг хасаж, том үсгээр. 5–20 оронтой тоо, эсвэл
 * MN-ээр эхэлсэн IBAN (MN + 18 орон).
 */
export function normalizeAccountNumber(raw: string | null | undefined): AccountParse {
  const v = String(raw ?? '')
    .replace(/[\s-]+/g, '')
    .toUpperCase();
  if (/^\d{5,20}$/.test(v) || /^MN\d{18}$/.test(v)) return { ok: true, value: v };
  return { ok: false, error: 'Дансны дугаар 5–20 оронтой тоо, эсвэл MN-ээр эхэлсэн IBAN байна' };
}

/** Аудитад: сүүлийн 4 орноос бусдыг нууна — «****5678». */
export function maskAccountNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  return `****${value.slice(-4)}`;
}

/**
 * Данс засах эрх: цаг бөглөх эрхтэй хүн (teacher-hours.edit, Админ) бүх багшийн
 * дансыг, бусад ажилтан ЗӨВХӨН өөрийнхөө дансыг.
 */
export function canEditAccount(input: { viewerId: string; targetId: string; canEditHours: boolean }): boolean {
  return input.canEditHours || input.viewerId === input.targetId;
}

/* ------------------------------------------- Хуваарьт орсон өдрүүд */

export interface StaffedDay {
  /** Тухайн өдөр ахлах/туслахаар оноогдсон хичээлийн нийт минут */
  minutes: number;
  lessons: number;
}

/**
 * Өдрийн хуваарьт (LessonStaffing — ахлах эсвэл туслах багш) бодитоор
 * оруулсан өдрүүд. resolveWeek-ийн гаралтаас: цуцалсан хичээл орохгүй, зөөсөн
 * хичээл шинэ өдөр/цагтаа, бүх ангийн амралтын өдөр тооцохгүй. Долоо хоногийн
 * хуваарь (TeacherWorkDay) энд ОРОХГҮЙ — зөвхөн тухайн өдөр гараар оноосон нь.
 */
export function staffedDays(
  days: ResolvedDay[],
  periodDays: ReadonlySet<string>,
): Map<string, Map<string, StaffedDay>> {
  const out = new Map<string, Map<string, StaffedDay>>();
  const seen = new Set<string>();
  for (const day of days) {
    if (!periodDays.has(day.date) || day.isHoliday) continue;
    for (const e of day.entries) {
      const key = `${e.scheduleId}|${day.date}|${e.startMinute}`;
      if (seen.has(key)) continue; // давхцсан цонхонд нэг хичээлийг 2 удаа тоолохгүй
      seen.add(key);
      const ids = new Set([e.leadTeacher?.id, e.assistantTeacher?.id].filter((v): v is string => !!v));
      for (const id of ids) {
        const byDate = out.get(id) ?? new Map<string, StaffedDay>();
        const cur = byDate.get(day.date) ?? { minutes: 0, lessons: 0 };
        cur.minutes += Math.max(0, e.endMinute - e.startMinute);
        cur.lessons += 1;
        byDate.set(day.date, cur);
        out.set(id, byDate);
      }
    }
  }
  return out;
}

/** Үеийг бүрхэх 7 хоногийн цонхнуудын эхлэл (давхцалгүй). */
export function weekStartsCovering(period: HalfMonthPeriod): string[] {
  const out: string[] = [];
  for (let i = 0; i < period.days.length; i += 7) out.push(period.days[i]);
  return out;
}

/* --------------------------------------------------- Мөрийн дараалал */

export interface SheetPerson {
  id: string;
  /** TeacherWorkDay.sortOrder-ийн хамгийн бага; хүснэгтэд байхгүй бол null */
  rosterOrder: number | null;
  name: string;
}

/**
 * Мөрийн дараалал: ажлын өдрийн хүснэгтийн дарааллаар (Excel-тэй ижил), дараа
 * нь хүснэгтэд байхгүй ч энэ үед цагтай/хуваарьт орсон хүмүүс нэрээр.
 */
export function orderSheetPeople<T extends SheetPerson>(people: T[]): T[] {
  return [...people].sort((a, b) => {
    if (a.rosterOrder !== null && b.rosterOrder !== null && a.rosterOrder !== b.rosterOrder)
      return a.rosterOrder - b.rosterOrder;
    if (a.rosterOrder === null && b.rosterOrder !== null) return 1;
    if (a.rosterOrder !== null && b.rosterOrder === null) return -1;
    return a.name.localeCompare(b.name, 'mn') || a.id.localeCompare(b.id);
  });
}
