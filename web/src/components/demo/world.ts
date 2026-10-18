/**
 * ДЕМО «ертөнц» — /demo/* бүх хэсэг (Ирц ба даалгавар, Хуваарь, Ангиуд, Сурагчид)
 * НЭГ л зохиомол өгөгдлийг хуваалцана: нэг сурагч хаана ч ижил нэр, код, ирц,
 * даалгавар, тестийн дүнтэй харагдана. Backend байхгүй, бүгд seed-тэй тул дахин
 * ачаалахад адилхан. Энэ файлын экспортын хэлбэрийг ӨӨРЧЛӨХГҮЙ — шинэ зүйл
 * хэрэгтэй бол шинэ экспорт нэмнэ (олон хэсэг зэрэг хамаардаг).
 *
 * Бодит системтэй тулгалт (жинхэнэ аппад хэрэгжүүлэхэд):
 * - Анги, хуваарь: Classroom + ClassSchedule(weekday, startMinute, endMinute, room).
 *   Ангийн нэр, тоо, цаг, танхим нь ӨС-ийн 2026-10 төлөвөөс; сурагчийн нэр БҮГД зохиомол.
 * - Ирц: Attendance(status PRESENT/LATE/ABSENT/EXEMPT, lateRange, note) — товшилт бүр upsert.
 * - Даалгавар: DailyHomeworkMark(status DONE/PARTIAL/NOT_DONE, comment) — товшилт бүр upsert.
 * - Хичээлийн сэдэв ба гэрийн даалгаврын тест: LessonTopic(title, chapterId) + Test.
 * - Тестийн бодлого бүрийн дүн, оролдлого: Attempt(testId, problemId, autoCorrect).
 * - Илгээлт (PDF), сэтгэгдэл, хугацаа: ШИНЭ загвар — docs/v2/DAALGAVAR-ZURAG-SUDALGAA.md §9, §11.
 */

/* ───────────────────────── Төрлүүд ───────────────────────── */

export type Branch = "Баруун 4" | "Зүүн 4";
export type AttStatus = "present" | "late" | "absent" | "excused";
/** = Prisma `LateRange` enum */
export type LateRange = "FIVE_TO_TEN" | "TEN_TO_THIRTY" | "THIRTY_TO_SIXTY" | "OVER_ONE_HOUR";
export type HwStatus = "done" | "partial" | "missing";
export type ProblemState = "correct" | "wrong" | "skipped";
export type TuitionPlan = "FULL_YEAR" | "INSTALLMENT" | "MONTHLY";
export type LessonChip = "Явцын шалгалт" | "Нэмэлт бодлого" | "Гар аргаар шалгалт";
export type LessonStatus = "upcoming" | "now" | "done";

export interface DemoTeacher {
  id: string;
  /** «О. Баасанжав» */
  name: string;
  role: "TEACHER" | "TEACHER_PLUS";
}

export interface DemoRoom {
  id: string;
  capacity: number;
  branch: Branch;
  /** 405 — зөвхөн нөхөх хичээл, тогтмол хуваарьт ордоггүй */
  makeupOnly?: boolean;
}

export interface Slot {
  /** 0 = Даваа … 6 = Ням */
  day: number;
  start: string;
  end: string;
  room: string;
}

export interface DemoStudent {
  id: string;
  classId: string;
  /** Ангийн жагсаалт дахь дугаар (1-ээс) */
  index: number;
  lastName: string;
  firstName: string;
  /** «Б. Өсөхбаяр» — овгийн эхний үсэг + нэр */
  name: string;
  /** 7 оронтой код (2027xxx) — Excel импорт ба гараар бүртгэлтэй ижил */
  code: string;
  phone: string;
  fatherPhone: string | null;
  motherPhone: string | null;
  school: string;
  /** Сургуулийн анги (9–12) */
  grade: number;
  /** Хичээлд сурч эхэлсэн өдөр (YYYY-MM-DD) */
  joinedOn: string;
  /** Бүртгүүлсэн өдөр (YYYY-MM-DD) */
  registeredOn: string;
  /** Сайтад сүүлд орсон («YYYY-MM-DDTHH:mm», УБ-ын цаг); null = нэвтэрч үзээгүй */
  lastSeenAt: string | null;
  tuitionPlan: TuitionPlan;
  /** 0..1 — нуугдмал «чадвар», дүн/даалгаврыг тууштай болгоход л ашиглана */
  ability: number;
}

export interface DemoClass {
  id: string;
  /** «12-1 (Баруун 4)» */
  name: string;
  /** «12-1» */
  label: string;
  branch: Branch;
  slots: Slot[];
  leadId: string;
  assistantId: string | null;
  students: DemoStudent[];
}

export interface DemoTest {
  id: string;
  /** «Модультай тэгшитгэл 2 — A» */
  title: string;
  topic: string;
  variant: "A" | "B";
  problems: number;
  /** Номын нэр (жишээ) */
  book: string;
}

export interface DemoLesson {
  id: string;
  classId: string;
  dateKey: string;
  slot: Slot;
  /** Тухайн өдөр заах сэдэв */
  topic: string;
  /** Энэ хичээл дээр ШАЛГАХ гэрийн даалгавар (өмнөх хичээлд өгсөн тест) */
  homework: DemoTest | null;
  /** Энэ хичээлд ӨГӨХ гэрийн даалгавар (дараагийн хичээлд шалгана) */
  assigned: DemoTest;
  chips: LessonChip[];
  leadId: string;
  assistantId: string | null;
  /** Хичээл орсныг баталсан эсэх (өнгөрсөн хичээлийн ихэнх нь баталгаатай) */
  confirmed: boolean;
  status: LessonStatus;
}

export interface Submission {
  pages: number;
  /** «YYYY-MM-DDTHH:mm» */
  submittedAt: string;
  resubmitted: boolean;
}

export interface DayRecord {
  att: AttStatus | null;
  lateRange: LateRange | null;
  attNote: string;
  hw: HwStatus | null;
  hwNote: string;
  submission: Submission | null;
}

export interface ProblemResult {
  n: number;
  state: ProblemState;
  attempts: number;
}

export interface TestResult {
  testId: string;
  problems: ProblemResult[];
  correct: number;
  wrong: number;
  skipped: number;
  attempts: number;
}

export interface Tally {
  lessons: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attUnmarked: number;
  hwDone: number;
  hwPartial: number;
  hwMissing: number;
  hwUnmarked: number;
  submitted: number;
}

export interface PaymentSummary {
  plan: TuitionPlan;
  expected: number;
  paid: number;
  outstanding: number;
  status: "paid" | "partial" | "unpaid";
  lastPaidOn: string | null;
}

export interface ExamResult {
  id: string;
  dateKey: string;
  title: string;
  /** student.id → хувь (0..100); өгөөгүй бол байхгүй */
  scores: Record<string, number>;
  average: number;
}

/* ───────────────────────── Шошго ───────────────────────── */

export const LATE_RANGES: LateRange[] = ["FIVE_TO_TEN", "TEN_TO_THIRTY", "THIRTY_TO_SIXTY", "OVER_ONE_HOUR"];
/** = components/attendance/LateRangePicker LATE_RANGE_OPTIONS */
export const LATE_RANGE_LABEL: Record<LateRange, string> = {
  FIVE_TO_TEN: "5–10 минут",
  TEN_TO_THIRTY: "10–30 минут",
  THIRTY_TO_SIXTY: "30 минут – 1 цаг",
  OVER_ONE_HOUR: "1 цагаас дээш",
};
export const LATE_RANGE_SHORT: Record<LateRange, string> = {
  FIVE_TO_TEN: "5–10 мин",
  TEN_TO_THIRTY: "10–30 мин",
  THIRTY_TO_SIXTY: "30–60 мин",
  OVER_ONE_HOUR: "1 ц+",
};
/** = components/attendance/NoteAutocomplete NOTE_SUGGESTIONS (бодит апп) */
export const ABSENCE_REASONS = ["өвчтэй", "тэмцээн", "олимпиад", "гэр бүлийн шалтгаан", "эмнэлэг", "хичээлийн бус ажил"] as const;
export const HOMEWORK_REASONS = ["дэвтрээ мартсан", "ойлгоогүй", "хагас хийсэн"] as const;

export const TUITION_PLAN_LABEL: Record<TuitionPlan, string> = {
  FULL_YEAR: "Бүтэн жил",
  INSTALLMENT: "Хуваан төлөх",
  MONTHLY: "Сар бүр",
};

/* ───────────────────────── Санамсаргүй (seed) ───────────────────────── */

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function rngFrom(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Түлхүүрээс тогтмол [0,1) тоо */
export const rnd = (key: string): number => rngFrom(hashStr(key))();

function pick<T>(list: readonly T[], r: number): T {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}

/* ───────────────────────── Огноо ───────────────────────── */

export const WEEKDAYS_SHORT = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
export const WEEKDAYS_FULL = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба", "Ням"];

const pad = (n: number) => String(n).padStart(2, "0");

/** 0 = Даваа … 6 = Ням (JS-ийн 0 = Ням-ээс хөрвүүлнэ) */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: string, n: number): string {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** «15:00» → 900 минут */
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMin(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function monthLabel(y: number, m: number): string {
  return `${y} оны ${m + 1}-р сар`;
}

export function longLabel(d: Date): string {
  return `${d.getMonth() + 1}-р сарын ${d.getDate()}, ${WEEKDAYS_FULL[mondayIndex(d)]}`;
}

export function daysOfMonth(y: number, m: number): Date[] {
  const n = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => new Date(y, m, i + 1));
}

export function todayKey(): string {
  return toKey(new Date());
}

/** Одоогийн минут (өдрийн 00:00-оос) */
export function nowMinute(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** «YYYY-MM-DDTHH:mm» агшныг (өдөр, минут) болгож харьцуулахад */
export function stamp(dateKey: string, minute: number): string {
  const extra = Math.floor(minute / 1440);
  const m = ((minute % 1440) + 1440) % 1440;
  return `${addDays(dateKey, minute < 0 ? -1 : extra)}T${fromMin(m)}`;
}

/** Улирал эхэлсэн өдөр (1-р долоо хоног) */
export const SEASON_START = "2026-08-31";

/* ───────────────────────── Багш, танхим ───────────────────────── */

export const TEACHERS: DemoTeacher[] = [
  { id: "t01", name: "О. Баасанжав", role: "TEACHER_PLUS" },
  { id: "t02", name: "Д. Дуламсүрэн", role: "TEACHER_PLUS" },
  { id: "t03", name: "Г. Золжаргал", role: "TEACHER" },
  { id: "t04", name: "Д. Оюунчимэг", role: "TEACHER" },
  { id: "t05", name: "Т. Энхжин", role: "TEACHER" },
  { id: "t06", name: "Н. Мөнхтуяа", role: "TEACHER" },
  { id: "t07", name: "Б. Ариунаа", role: "TEACHER" },
  { id: "t08", name: "С. Батзориг", role: "TEACHER" },
  { id: "t09", name: "Ц. Номин", role: "TEACHER" },
  { id: "t10", name: "Э. Түвшинжаргал", role: "TEACHER" },
  { id: "t11", name: "Л. Ганзориг", role: "TEACHER" },
  { id: "t12", name: "А. Сарнай", role: "TEACHER" },
];

/** Демог «нэвтэрсэн» хэрэглэгч — толгойн «ОБ» */
export const ME: DemoTeacher = TEACHERS[0];

export function teacherById(id: string | null | undefined): DemoTeacher | null {
  return TEACHERS.find((t) => t.id === id) ?? null;
}

/** «О. Баасанжав» → «ОБ» */
export function initials(name: string): string {
  const [a, b] = name.replace(".", "").split(/\s+/);
  return `${a?.charAt(0) ?? ""}${b?.charAt(0) ?? ""}`.toUpperCase();
}

/** Бодит танхим, багтаамж (components/schedule/types.ts ROOMS) */
export const ROOMS: DemoRoom[] = [
  { id: "501", capacity: 42, branch: "Баруун 4" },
  { id: "502", capacity: 32, branch: "Баруун 4" },
  { id: "503", capacity: 32, branch: "Баруун 4" },
  { id: "504", capacity: 24, branch: "Баруун 4" },
  { id: "403", capacity: 32, branch: "Баруун 4" },
  { id: "404", capacity: 24, branch: "Баруун 4" },
  { id: "405", capacity: 12, branch: "Баруун 4", makeupOnly: true },
  { id: "301", capacity: 28, branch: "Зүүн 4" },
  { id: "302", capacity: 32, branch: "Зүүн 4" },
];

/* ───────────────────────── Ангиуд (бодит хуваарь) ───────────────────────── */

// [id, нэр, сурагчийн тоо, хуваарь «гарагууд@эхлэх-дуусах#танхим;…»] — гараг 0 = Даваа.
// ӨС-ийн 2026-10 төлөвөөс; 13-3, 13-4, 9-2 хуваарьгүй байсан тул чөлөөтэй цагт тавив.
const CLASS_DEFS: Array<[string, string, number, string]> = [
  ["c091", "9-1 (Баруун 4)", 32, "0,2,4@15:00-17:30#502"],
  ["c101", "10-1 (Баруун 4)", 24, "1,3@15:00-17:30#504;5@10:00-12:00#504"],
  ["c111", "11-1 (Баруун 4)", 23, "0,2,4@15:00-17:30#504"],
  ["c112", "11-2 (Баруун 4)", 31, "1,3@15:00-17:30#503;5@10:00-12:00#502"],
  ["c121", "12-1 (Баруун 4)", 31, "0,2,4@15:00-17:30#503;5@10:00-12:00#503"],
  ["c122", "12-2 (Баруун 4)", 40, "6@10:00-12:00#501;1,3@15:00-17:30#501;5@13:00-15:00#501"],
  ["c123", "12-3 (Баруун 4)", 41, "0,2,4@15:00-17:30#501;5@10:00-12:00#501"],
  ["c124", "12-4 (Баруун 4)", 33, "6@10:00-12:00#502;1,3@15:00-17:30#502;5@13:00-15:00#502"],
  ["c125", "12-5 (Баруун 4)", 31, "0,2,4@15:00-17:30#403;5@10:00-12:00#403"],
  ["c126", "12-6 (Баруун 4)", 30, "6@10:00-12:00#503;1,3@15:00-17:30#403;5@13:00-15:00#503"],
  ["c127", "12-7 (Баруун 4)", 30, "0,2,4@17:30-19:30#503;5@16:00-18:00#504"],
  ["c128", "12-8 (Баруун 4)", 41, "6@13:00-15:00#501;1,3@17:30-19:30#501;5@16:00-18:00#501"],
  ["c129", "12-9 (Баруун 4)", 34, "0,2,4@17:30-19:30#502;5@16:00-18:00#503"],
  ["c1210", "12-10 (Баруун 4)", 27, "6@13:00-15:00#503;1,3@17:30-19:30#503;5@16:00-18:00#404"],
  ["c1211", "12-11 (Баруун 4)", 39, "0,2,4@17:30-19:30#501;5@16:00-18:00#502"],
  ["c1212", "12-12 (Баруун 4)", 33, "6@13:00-15:00#502;1,3@17:30-19:30#502;5@16:00-18:00#403"],
  ["c092", "9-2 (Зүүн 4)", 28, "1,3@15:00-17:30#301;5@13:00-15:00#301"],
  ["c113", "11-3 (Зүүн 4)", 24, "0,2,4@15:00-17:30#302"],
  ["c131", "13-1 (Зүүн 4)", 28, "0,2,4@15:00-17:30#301;5@10:00-12:00#301"],
  ["c132", "13-2 (Зүүн 4)", 23, "6@10:00-12:00#302;1,3@15:00-17:30#302;5@13:00-15:00#302"],
  ["c133", "13-3 (Зүүн 4)", 31, "1,3@17:30-19:30#302;5@16:00-18:00#302"],
  ["c134", "13-4 (Зүүн 4)", 26, "0,2,4@17:30-19:30#302"],
  ["cnii", "НИЙГЭМ (Зүүн 4)", 22, "1,3,5@17:30-19:30#301"],
];

function parseSlots(spec: string): Slot[] {
  return spec
    .split(";")
    .flatMap((part) => {
      const [days, rest] = part.split("@");
      const [times, room] = rest.split("#");
      const [start, end] = times.split("-");
      return days.split(",").map((d) => ({ day: Number(d), start, end, room }));
    })
    .sort((a, b) => a.day - b.day);
}

const LAST_NAMES = [
  "Батбаяр", "Баатар", "Билэгт", "Бямбасүрэн", "Ганбат", "Гантулга", "Доржсүрэн", "Дашдорж",
  "Дамдин", "Дэлгэр", "Жамбаа", "Жигмэд", "Лхагва", "Лувсан", "Ломбо", "Мөнх", "Нямдорж",
  "Намсрай", "Оюун", "Очир", "Пүрэв", "Сүхбаатар", "Сэргэлэн", "Содном", "Төмөр", "Түвшин",
  "Тогтох", "Цэрэн", "Цогт", "Чимэд", "Шагдар", "Шарав", "Энхтайван", "Эрдэнэ", "Хашбат",
  "Хүрэлбаатар", "Ядамсүрэн", "Буянтогтох", "Гэрэлт", "Алтангэрэл", "Алтансүх", "Амгалан",
  "Баярсайхан", "Батмөнх", "Болдбаатар", "Бямбадорж", "Гомбо", "Дорж",
];
const FIRST_NAMES = [
  "Өсөхбаяр", "Анужин", "Тэмүүлэн", "Хулан", "Номин-Эрдэнэ", "Тэнгис", "Мөнхжин", "Билгүүн",
  "Саруул", "Ундраа", "Анхбаяр", "Номинчимэг", "Золжаргал", "Эрдэнэбат", "Хүслэн", "Тэргэл",
  "Сэлэнгэ", "Хонгорзул", "Амаржаргал", "Бат-Оргил", "Энхжин", "Дөлгөөн", "Мишээл", "Одгэрэл",
  "Мөнх-Оргил", "Нандинцэцэг", "Эрхэмбаяр", "Билгүүдэй", "Дэлгэрмаа", "Гэрэлт-Од", "Намуун",
  "Содгэрэл", "Оюунбилэг", "Мөнхцэцэг", "Хишигбаяр", "Наранцогт", "Эрдэнэцэцэг", "Ананд",
  "Дулмаа", "Тэмүүжин", "Отгонбаяр", "Нандин", "Сарангэрэл", "Мөнхзул", "Энхмөнх", "Хонгор",
  "Ариунзаяа", "Тэлмэн", "Алтанцэцэг", "Мандахбаяр", "Гэрэлмаа", "Анхилуун", "Булган",
  "Сүхбат", "Чинзориг", "Зоригт", "Урангуа", "Цолмон", "Баттулга", "Идэр", "Мөнхсүх",
  "Тунгалаг", "Номунзул", "Ганзул", "Төгөлдөр", "Марал", "Батжаргал", "Сондор", "Ивээл",
  "Сэцэн", "Уянга", "Хангал",
];
const SCHOOLS = [
  "1-р сургууль", "23-р сургууль", "84-р сургууль", "11-р сургууль", "5-р сургууль",
  "Шинэ эхлэл", "Орчлон", "Сант", "Хобби", "Монгол-Туркийн сургууль", "28-р сургууль",
  "45-р сургууль",
];

function phoneFrom(key: string): string {
  const r = rngFrom(hashStr(key));
  const head = r() < 0.5 ? "8" : "9";
  let s = head;
  for (let i = 0; i < 7; i++) s += Math.floor(r() * 10);
  return s;
}

function schoolGrade(label: string, r: number): number {
  if (label.startsWith("9-")) return 9;
  if (label.startsWith("10-")) return 10;
  if (label.startsWith("11-")) return 11;
  // 12-x, 13-x, НИЙГЭМ: ихэнх нь 12, цөөн нь 11-р анги
  return r < 0.15 ? 11 : 12;
}

function buildClasses(): DemoClass[] {
  const used = new Set<string>();
  let code = 2027001;
  const teachersPool = TEACHERS.map((t) => t.id);
  return CLASS_DEFS.map(([id, name, count, spec], ci) => {
    const label = name.split(" (")[0];
    const branch: Branch = name.includes("Зүүн") ? "Зүүн 4" : "Баруун 4";
    const r = rngFrom(hashStr(`class|${id}`));
    const picked: Array<[string, string]> = [];
    while (picked.length < count) {
      const last = pick(LAST_NAMES, r());
      const first = pick(FIRST_NAMES, r());
      const k = `${last}|${first}`;
      if (used.has(k)) continue;
      used.add(k);
      picked.push([last, first]);
    }
    picked.sort((a, b) => a[0].localeCompare(b[0], "mn") || a[1].localeCompare(b[1], "mn"));
    const students: DemoStudent[] = picked.map(([lastName, firstName], i) => {
      const sid = `${id}-s${i + 1}`;
      const sr = rngFrom(hashStr(`student|${sid}`));
      const joinOffset = sr() < 0.7 ? 0 : Math.floor(sr() * 40);
      const joinedOn = addDays(SEASON_START, joinOffset);
      const registeredOn = addDays(joinedOn, -(1 + Math.floor(sr() * 60)));
      const seenRoll = sr();
      const lastSeenAt =
        seenRoll < 0.12
          ? null
          : stamp(addDays(todayKey(), -Math.floor(Math.pow(sr(), 2.2) * 10)), 7 * 60 + Math.floor(sr() * 15 * 60));
      const planRoll = sr();
      return {
        id: sid,
        classId: id,
        index: i + 1,
        lastName,
        firstName,
        name: `${lastName.charAt(0)}. ${firstName}`,
        code: String(code++),
        phone: phoneFrom(`${sid}|p`),
        fatherPhone: sr() < 0.85 ? phoneFrom(`${sid}|f`) : null,
        motherPhone: sr() < 0.9 ? phoneFrom(`${sid}|m`) : null,
        school: pick(SCHOOLS, sr()),
        grade: schoolGrade(label, sr()),
        joinedOn,
        registeredOn,
        lastSeenAt,
        tuitionPlan: planRoll < 0.45 ? "FULL_YEAR" : planRoll < 0.75 ? "INSTALLMENT" : "MONTHLY",
        ability: Math.min(0.98, Math.max(0.08, 0.25 + sr() * 0.75)),
      };
    });
    return {
      id,
      name,
      label,
      branch,
      slots: parseSlots(spec),
      leadId: teachersPool[ci % teachersPool.length],
      assistantId: null,
      students,
    };
  });
}

function slotsOverlap(a: Slot, b: Slot): boolean {
  return a.day === b.day && toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);
}

/**
 * Багшийг давхардалгүй оноох: нэг багш нэг цагт хоёр ангид орохгүй (бодит дүрэм).
 * Үндсэн багш заавал; туслах багш ≈60% ангид, тэр цагт чөлөөтэй багш байвал л.
 */
function assignTeachers(classes: DemoClass[]): void {
  const busy = new Map<string, Slot[]>();
  const free = (tid: string, slots: Slot[]) => !(busy.get(tid) ?? []).some((b) => slots.some((s) => slotsOverlap(b, s)));
  const take = (tid: string, slots: Slot[]) => busy.set(tid, [...(busy.get(tid) ?? []), ...slots]);
  const orderFor = (ci: number) => TEACHERS.map((_, i) => TEACHERS[(ci + i) % TEACHERS.length].id);
  // 1) Үндсэн багш — бүх ангид эхэлж (туслах багш нар үндсэн багшийн цагийг «идэхгүй»)
  classes.forEach((c, ci) => {
    const lead = orderFor(ci).find((t) => free(t, c.slots)) ?? orderFor(ci)[0];
    take(lead, c.slots);
    c.leadId = lead;
  });
  // 2) Туслах багш — тэр цагт чөлөөтэй багш байвал л
  classes.forEach((c, ci) => {
    const assistant =
      rnd(`assistant|${c.id}`) < 0.6 ? ([...orderFor(ci)].reverse().find((t) => t !== c.leadId && free(t, c.slots)) ?? null) : null;
    if (assistant) take(assistant, c.slots);
    c.assistantId = assistant;
  });
}

/** Баруун 4 эхэнд, Зүүн 4 доор (эзний дараалал) */
export const CLASSES: DemoClass[] = buildClasses();
assignTeachers(CLASSES);
export const ALL_STUDENTS: DemoStudent[] = CLASSES.flatMap((c) => c.students);

const classMap = new Map(CLASSES.map((c) => [c.id, c]));
const studentMap = new Map(ALL_STUDENTS.map((s) => [s.id, s]));

export function classById(id: string): DemoClass | null {
  return classMap.get(id) ?? null;
}
export function studentById(id: string): DemoStudent | null {
  return studentMap.get(id) ?? null;
}

/** Ангийн хичээлтэй гарагууд (0 = Даваа …), давхардалгүй */
export function lessonDays(cls: DemoClass): number[] {
  return [...new Set(cls.slots.map((s) => s.day))];
}

/** Тухайн өдрийн хичээлийн цаг (байхгүй бол null) */
export function slotOn(cls: DemoClass, dateKey: string): Slot | null {
  const wd = mondayIndex(fromKey(dateKey));
  return cls.slots.find((s) => s.day === wd) ?? null;
}

/** Өнөөдрөөс өмнөх (эсвэл өнөөдрийн) хамгийн сүүлийн хичээлтэй өдөр */
export function latestLessonDayKey(cls: DemoClass, fromDay: string = todayKey()): string {
  let k = fromDay;
  for (let i = 0; i < 14 && !slotOn(cls, k); i++) k = addDays(k, -1);
  return k;
}

/* ───────────────────────── Тест, хичээлийн сэдэв ───────────────────────── */

const TOPICS_SENIOR = [
  "Модультай тэгшитгэл", "Квадрат тэгшитгэл", "Илтгэгч функц", "Логарифм", "Тригонометр",
  "Уламжлал", "Интеграл", "Вектор", "Магадлал", "Прогресс", "Функцийн график", "Комбинаторик",
];
const TOPICS_JUNIOR = [
  "Бутархай", "Хувь", "Шугаман тэгшитгэл", "Тэгшитгэлийн систем", "Квадрат язгуур", "Үржигдэхүүнд задлах",
  "Гурвалжин", "Пифагорын теорем", "Тойрог", "Шугаман функц", "Квадрат функц", "Статистик",
];

const testCache = new Map<string, DemoTest>();

function testFor(topic: string, part: number, variant: "A" | "B", junior: boolean): DemoTest {
  const id = `${topic}|${part}|${variant}`;
  const hit = testCache.get(id);
  if (hit) return hit;
  const t: DemoTest = {
    id,
    title: `${topic} ${part} — ${variant}`,
    topic,
    variant,
    problems: 10 + Math.floor(rnd(`problems|${id}`) * 6),
    book: junior ? "100x100 V3 (суурь)" : "200x200 V3",
  };
  testCache.set(id, t);
  return t;
}

/** Хичээл улирлын хэд дэх хичээл вэ (0-ээс) — сэдэв, тестийг дараалуулахад */
const lessonIndexCache = new Map<string, number>();
function lessonIndex(cls: DemoClass, dateKey: string): number {
  const key = `${cls.id}|${dateKey}`;
  const hit = lessonIndexCache.get(key);
  if (hit !== undefined) return hit;
  let n = 0;
  for (let k = SEASON_START; k < dateKey; k = addDays(k, 1)) if (slotOn(cls, k)) n++;
  lessonIndexCache.set(key, n);
  return n;
}

function planAt(cls: DemoClass, index: number): DemoTest {
  const junior = /^(9|10)-/.test(cls.label);
  const topics = junior ? TOPICS_JUNIOR : TOPICS_SENIOR;
  const offset = hashStr(cls.id) % topics.length;
  const topic = topics[Math.floor(index / 3 + offset) % topics.length];
  const part = (index % 3) + 1;
  const variant: "A" | "B" = rnd(`variant|${cls.id}|${index}`) < 0.5 ? "A" : "B";
  return testFor(topic, part, variant, junior);
}

const lessonCache = new Map<string, DemoLesson | null>();

/** Ангийн тухайн өдрийн хичээл (хичээлгүй бол null) */
export function lessonOn(cls: DemoClass, dateKey: string): DemoLesson | null {
  const key = `${cls.id}|${dateKey}`;
  if (lessonCache.has(key)) return withStatus(lessonCache.get(key) ?? null);
  const slot = slotOn(cls, dateKey);
  let lesson: DemoLesson | null = null;
  if (slot && dateKey >= SEASON_START) {
    const i = lessonIndex(cls, dateKey);
    const assigned = planAt(cls, i);
    const chipRoll = rnd(`chip|${key}`);
    const chips: LessonChip[] =
      chipRoll < 0.1 ? ["Явцын шалгалт"] : chipRoll < 0.18 ? ["Нэмэлт бодлого"] : chipRoll < 0.22 ? ["Гар аргаар шалгалт"] : [];
    // Заримдаа туслах багш өөр (сэлгээ), заримдаа үндсэн багш л
    const swap = rnd(`swap|${key}`);
    lesson = {
      id: `L|${key}`,
      classId: cls.id,
      dateKey,
      slot,
      topic: assigned.topic,
      homework: i > 0 ? planAt(cls, i - 1) : null,
      assigned,
      chips,
      leadId: cls.leadId,
      assistantId: swap < 0.15 ? null : cls.assistantId,
      confirmed: false,
      status: "upcoming",
    };
  }
  lessonCache.set(key, lesson);
  return withStatus(lesson);
}

/** Төлөв ба баталгаажуулалт одоогийн цагаас хамаарна — кэшлэхгүй */
function withStatus(lesson: DemoLesson | null): DemoLesson | null {
  if (!lesson) return null;
  const status = lessonStatus(lesson.dateKey, lesson.slot);
  const confirmed = status === "done" && rnd(`confirm|${lesson.id}`) < (lesson.dateKey < todayKey() ? 0.95 : 0.5);
  return { ...lesson, status, confirmed };
}

export function lessonStatus(dateKey: string, slot: Slot): LessonStatus {
  const today = todayKey();
  if (dateKey < today) return "done";
  if (dateKey > today) return "upcoming";
  const now = nowMinute();
  if (now < toMin(slot.start)) return "upcoming";
  if (now < toMin(slot.end)) return "now";
  return "done";
}

/** Тухайн өдрийн БҮХ хичээл: Баруун 4 эхэнд, дараа нь эхлэх цаг, танхим */
export function lessonsOnDate(dateKey: string): DemoLesson[] {
  const roomOrder = ROOMS.map((r) => r.id);
  return CLASSES.map((c) => lessonOn(c, dateKey))
    .filter((l): l is DemoLesson => !!l)
    .sort((a, b) => {
      const ba = classById(a.classId)?.branch === "Зүүн 4" ? 1 : 0;
      const bb = classById(b.classId)?.branch === "Зүүн 4" ? 1 : 0;
      return ba - bb || toMin(a.slot.start) - toMin(b.slot.start) || roomOrder.indexOf(a.slot.room) - roomOrder.indexOf(b.slot.room);
    });
}

/** Тухайн өдөр ажиллах багш нар (тэр өдрийн хичээлүүдээс) */
export function teachersOnDate(dateKey: string): DemoTeacher[] {
  const ids = new Set<string>();
  for (const l of lessonsOnDate(dateKey)) {
    ids.add(l.leadId);
    if (l.assistantId) ids.add(l.assistantId);
  }
  return TEACHERS.filter((t) => ids.has(t.id));
}

/* ───────────────────────── Өдрийн ирц, даалгавар, илгээлт ───────────────────────── */

const LATE_WEIGHTS: Array<[LateRange, number]> = [
  ["FIVE_TO_TEN", 0.5],
  ["TEN_TO_THIRTY", 0.8],
  ["THIRTY_TO_SIXTY", 0.95],
  ["OVER_ONE_HOUR", 1],
];

/** Илгээлтийн хуудасны тархалт (1–6) */
function pagesFrom(r: number): number {
  if (r < 0.1) return 1;
  if (r < 0.35) return 2;
  if (r < 0.65) return 3;
  if (r < 0.85) return 4;
  if (r < 0.95) return 5;
  return 6;
}

const EMPTY: DayRecord = { att: null, lateRange: null, attNote: "", hw: null, hwNote: "", submission: null };

/**
 * Сурагчийн тухайн өдрийн бүртгэл (анхны төлөв). Хичээлгүй өдөр хоосон.
 * Ирээдүйн хичээлд тэмдэглэгээ байхгүй (багш урьдчилж тэмдэглэж болно), харин
 * өмнөх оройн илгээлт байж болно. Өнөөдрийн явагдаж буй/дууссан хичээл хагас тэмдэглэгдсэн.
 */
export function dayRecord(cls: DemoClass, dateKey: string, student: DemoStudent): DayRecord {
  const lesson = lessonOn(cls, dateKey);
  if (!lesson) return EMPTY;
  const base = `${dateKey}|${student.id}`;
  const r = rngFrom(hashStr(`day|${base}`));

  // Илгээлт: шалгах тест байвал ≈35–80% (чадвараас), ихэнх нь өмнөх орой
  let submission: Submission | null = null;
  if (lesson.homework && r() < 0.35 + 0.45 * student.ability) {
    const startMin = toMin(lesson.slot.start);
    const when = r();
    const minute =
      when < 0.7
        ? -(24 * 60) + 18 * 60 + Math.floor(r() * 330) // өмнөх өдөр 18:00–23:30
        : when < 0.9
          ? Math.max(7 * 60, startMin - 30 - Math.floor(r() * 180)) // тэр өдөр хичээлээс өмнө
          : startMin + 5 + Math.floor(r() * 120); // хичээл эхэлсний дараа (хоцорсон)
    const submittedAt = minute < 0 ? stamp(addDays(dateKey, -1), minute + 24 * 60) : stamp(dateKey, minute);
    const nowStamp = stamp(todayKey(), nowMinute());
    if (submittedAt <= nowStamp) submission = { pages: pagesFrom(r()), submittedAt, resubmitted: r() < 0.18 };
  }

  if (lesson.status === "upcoming") return { ...EMPTY, submission };

  // Тэмдэглэгээ: өнгөрсөн хичээл бараг бүрэн, өнөөдрийнх ~70%
  const markedRate = lesson.dateKey < todayKey() ? 0.97 : 0.7;
  const attMarked = r() < markedRate;
  // Ихэнх хүүхэд тогтмол ирдэг; цөөн хэд нь байнга хоцордог/тасалдаг (бодит тархалт)
  const lateProne = rnd(`lateProne|${student.id}`) < 0.06;
  const absentProne = rnd(`absentProne|${student.id}`) < 0.05;
  let att: AttStatus | null = null;
  let lateRange: LateRange | null = null;
  let attNote = "";
  if (attMarked) {
    const a = r();
    const pAbsent = absentProne ? 0.2 : 0.025;
    const pExcused = 0.025;
    const pLate = lateProne ? 0.25 : 0.035;
    if (a < pAbsent) att = "absent";
    else if (a < pAbsent + pExcused) att = "excused";
    else if (a < pAbsent + pExcused + pLate) att = "late";
    else att = "present";
    if (att === "late") {
      const lr = r();
      lateRange = LATE_WEIGHTS.find(([, w]) => lr < w)?.[0] ?? "FIVE_TO_TEN";
      if (r() < 0.2) attNote = "замын түгжрэл";
    } else if (att === "absent" && r() < 0.6) attNote = pick(ABSENCE_REASONS, r());
    else if (att === "excused" && r() < 0.85) attNote = pick(ABSENCE_REASONS, r());
  }

  let hw: HwStatus | null = null;
  let hwNote = "";
  const attended = att === "present" || att === "late";
  if (lesson.homework && attended && r() < (lesson.dateKey < todayKey() ? 0.94 : 0.6)) {
    const h = r();
    const pDone = 0.45 + 0.52 * student.ability;
    const pPartial = (1 - pDone) * 0.55;
    hw = h < pDone ? "done" : h < pDone + pPartial ? "partial" : "missing";
    if (hw !== "done" && r() < 0.35) hwNote = pick(HOMEWORK_REASONS, r());
  }
  return { att, lateRange, attNote, hw, hwNote, submission };
}

/* ───────────────────────── Тестийн дүн (бодлого бүрээр) ───────────────────────── */

/**
 * Гэрийн даалгаврын тестийг онлайнаар бодсон дүн. Бодоогүй бол null.
 * Бодит: Attempt мөрүүд (testId, problemId, autoCorrect) — оролдлого = мөрийн тоо.
 */
export function testResult(student: DemoStudent, test: DemoTest): TestResult | null {
  const r = rngFrom(hashStr(`test|${student.id}|${test.id}`));
  if (r() > 0.45 + 0.45 * student.ability) return null;
  const problems: ProblemResult[] = Array.from({ length: test.problems }, (_, i) => {
    const difficulty = 0.1 + rnd(`diff|${test.id}|${i}`) * 0.5;
    const skipP = 0.05 + (1 - student.ability) * 0.12;
    const x = r();
    if (x < skipP) return { n: i + 1, state: "skipped" as const, attempts: 0 };
    const correctP = Math.min(0.97, Math.max(0.05, 0.35 + student.ability * 0.7 - difficulty));
    const correct = r() < correctP;
    const attempts = correct ? (r() < 0.7 ? 1 : 2) : 1 + Math.floor(r() * 3);
    return { n: i + 1, state: correct ? ("correct" as const) : ("wrong" as const), attempts };
  });
  const count = (s: ProblemState) => problems.filter((p) => p.state === s).length;
  return {
    testId: test.id,
    problems,
    correct: count("correct"),
    wrong: count("wrong"),
    skipped: count("skipped"),
    attempts: problems.reduce((sum, p) => sum + p.attempts, 0),
  };
}

/* ───────────────────────── Нэгтгэл ───────────────────────── */

export function emptyTally(): Tally {
  return { lessons: 0, present: 0, late: 0, absent: 0, excused: 0, attUnmarked: 0, hwDone: 0, hwPartial: 0, hwMissing: 0, hwUnmarked: 0, submitted: 0 };
}

export function addToTally(t: Tally, rec: DayRecord): void {
  if (rec.att === "present") t.present++;
  else if (rec.att === "late") t.late++;
  else if (rec.att === "absent") t.absent++;
  else if (rec.att === "excused") t.excused++;
  else t.attUnmarked++;
  if (rec.hw === "done") t.hwDone++;
  else if (rec.hw === "partial") t.hwPartial++;
  else if (rec.hw === "missing") t.hwMissing++;
  else t.hwUnmarked++;
  if (rec.submission) t.submitted++;
}

/** Ангийн нэг өдрийн нэгтгэл (анхны төлөвөөр) */
export function classDayTally(cls: DemoClass, dateKey: string): Tally {
  const t = emptyTally();
  if (!lessonOn(cls, dateKey)) return t;
  t.lessons = 1;
  for (const s of cls.students) addToTally(t, dayRecord(cls, dateKey, s));
  return t;
}

/** Хичээлтэй өдрүүд [from, to] (хоёулаа орно) */
export function lessonDateKeys(cls: DemoClass, from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) if (slotOn(cls, k)) out.push(k);
  return out;
}

/** Сурагчийн нэгтгэл [from, to] — өнөөдрөөс хойших хичээлийг тоолохгүй */
export function studentTally(cls: DemoClass, student: DemoStudent, from: string, to: string): Tally {
  const t = emptyTally();
  const last = to < todayKey() ? to : todayKey();
  for (const k of lessonDateKeys(cls, from < student.joinedOn ? student.joinedOn : from, last)) {
    const l = lessonOn(cls, k);
    if (!l || l.status === "upcoming") continue;
    t.lessons++;
    addToTally(t, dayRecord(cls, k, student));
  }
  return t;
}

/** Ирцийн хувь: (ирсэн + хоцорсон) / тэмдэглэгдсэн; тэмдэглэгээгүй бол null */
export function attendanceRate(t: Tally): number | null {
  const marked = t.present + t.late + t.absent + t.excused;
  return marked ? Math.round(((t.present + t.late) / marked) * 100) : null;
}

/** Даалгаврын хувь: хийсэн / тэмдэглэгдсэн (дутуу = хагас) */
export function homeworkRate(t: Tally): number | null {
  const marked = t.hwDone + t.hwPartial + t.hwMissing;
  return marked ? Math.round(((t.hwDone + t.hwPartial * 0.5) / marked) * 100) : null;
}

/* ───────────────────────── Шалгалт (Явцын шалгалт) ───────────────────────── */

/** Ангийн «Явцын шалгалт» тэмдэгтэй, өнгөрсөн хичээлүүдийн дүн (шинэ нь эхэнд) */
export function classExams(cls: DemoClass, upTo: string = todayKey()): ExamResult[] {
  const out: ExamResult[] = [];
  for (const k of lessonDateKeys(cls, SEASON_START, upTo)) {
    const l = lessonOn(cls, k);
    if (!l || l.status !== "done" || !l.chips.includes("Явцын шалгалт")) continue;
    const scores: Record<string, number> = {};
    for (const s of cls.students) {
      if (s.joinedOn > k) continue;
      const rec = dayRecord(cls, k, s);
      if (rec.att === "absent" || rec.att === "excused") continue;
      const noise = (rnd(`exam|${l.id}|${s.id}`) - 0.5) * 30;
      scores[s.id] = Math.round(Math.min(100, Math.max(5, s.ability * 85 + 10 + noise)));
    }
    const vals = Object.values(scores);
    out.push({
      id: l.id,
      dateKey: k,
      title: `Явцын шалгалт — ${l.topic}`,
      scores,
      average: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    });
  }
  return out.reverse();
}

/* ───────────────────────── Төлбөр ───────────────────────── */

/** Сарын төлбөр (12-р анги 350,000₮; 9–11-р анги 300,000₮) */
export function monthlyFee(student: DemoStudent): number {
  return student.grade >= 12 ? 350_000 : 300_000;
}

/** Улирлаас хойш өнөөдрийг хүртэлх төлбөрийн байдал (9-р сараас эхэлнэ) */
export function paymentOf(student: DemoStudent): PaymentSummary {
  const fee = monthlyFee(student);
  const today = fromKey(todayKey());
  const months = Math.max(1, (today.getFullYear() - 2026) * 12 + today.getMonth() - 8 + 1);
  const r = rngFrom(hashStr(`pay|${student.id}`));
  const plan = student.tuitionPlan;
  const expected = plan === "FULL_YEAR" ? fee * 9 : plan === "INSTALLMENT" ? Math.ceil(fee * 4.5) : fee * months;
  const roll = r();
  const paid =
    roll < 0.78 ? expected : roll < 0.92 ? Math.round((expected * (0.3 + r() * 0.5)) / 50_000) * 50_000 : 0;
  const outstanding = Math.max(0, expected - paid);
  return {
    plan,
    expected,
    paid,
    outstanding,
    status: outstanding === 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
    lastPaidOn: paid > 0 ? addDays(SEASON_START, Math.floor(r() * 40)) : null,
  };
}

/** «2500000» → «2,500,000₮» */
export function fmtMoney(n: number): string {
  return `${n.toLocaleString("en-US")}₮`;
}

/* ───────────────────────── Онлайн идэвх ───────────────────────── */

/** Бодлого, шалгалт бодож байхдаа сайтаас гарсан тоо (users.service studentFocus-тэй адил) */
export function focusOf(student: DemoStudent): { testSessions: number; testLeaves: number; practiceLeaves: number } {
  const r = rngFrom(hashStr(`focus|${student.id}`));
  const testSessions = Math.floor(r() * 9);
  const restless = 1 - student.ability;
  return {
    testSessions,
    testLeaves: testSessions ? Math.floor(r() * restless * 3 * testSessions) : 0,
    practiceLeaves: Math.floor(r() * restless * 14),
  };
}

/** «8797 4469» */
export const fmtPhone = (p: string): string => `${p.slice(0, 4)} ${p.slice(4)}`;

/* ───────────────────────── Шалгуур (асуудалтай хүүхэд) ───────────────────────── */

/**
 * Багш+ ангийн шалгуур тавина; хангаагүй хүүхэд нэрийнхээ өмнө улаан тэмдэгтэй
 * (эзэн 2026-10-17). Бодит: Classroom-ийн тохиргоо (JSON) + ирц/даалгаврын нэгтгэл.
 */
export interface Criteria {
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

export const DEFAULT_CRITERIA: Criteria = {
  windowDays: 30,
  minAttendance: 80,
  maxAbsences: 3,
  maxLates: 4,
  minHomework: 60,
  missingStreak: 2,
};

export interface RiskFlag {
  kind: "attendance" | "absences" | "lates" | "homework" | "streak";
  /** Богино тайлбар: «Ирц 72%», «3 удаа тасалсан» */
  label: string;
}

/** Шалгуур хангаагүй зүйлс (хоосон = асуудалгүй) — [today − windowDays, today] */
export function riskOf(cls: DemoClass, student: DemoStudent, criteria: Criteria = DEFAULT_CRITERIA, upTo: string = todayKey()): RiskFlag[] {
  const from = addDays(upTo, -criteria.windowDays);
  const t = studentTally(cls, student, from, upTo);
  const flags: RiskFlag[] = [];
  const attDen = t.present + t.late + t.absent;
  const att = attDen ? Math.round(((t.present + t.late) / attDen) * 100) : null;
  if (att !== null && att < criteria.minAttendance) flags.push({ kind: "attendance", label: `Ирц ${att}%` });
  if (t.absent >= criteria.maxAbsences) flags.push({ kind: "absences", label: `${t.absent} удаа тасалсан` });
  if (t.late >= criteria.maxLates) flags.push({ kind: "lates", label: `${t.late} удаа хоцорсон` });
  const hw = homeworkRate(t);
  if (hw !== null && hw < criteria.minHomework) flags.push({ kind: "homework", label: `Даалгавар ${hw}%` });
  // Хамгийн сүүлийн тэмдэглэгдсэн даалгавраас хойш дараалсан «хийгээгүй»
  let streak = 0;
  const keys = lessonDateKeys(cls, from < student.joinedOn ? student.joinedOn : from, upTo).reverse();
  for (const k of keys) {
    const rec = dayRecord(cls, k, student);
    if (rec.hw === null) continue;
    if (rec.hw === "missing") streak++;
    else break;
  }
  if (streak >= criteria.missingStreak) flags.push({ kind: "streak", label: `${streak} удаа дараалан хийгээгүй` });
  return flags;
}

/** Хичээлтэй гараг эсэх (lessonDays нь 0 = Даваа …) — огнооны зурваст */
export function isLessonDay(d: Date, days: number[]): boolean {
  return days.includes(mondayIndex(d));
}
