/**
 * Гэрийн даалгаврыг ӨГСӨН ХИЧЭЭЛЭЭР (анги + огноо) нэрлэх — эзэн 2026-10-27.
 * Сурагч ном/бүлэг/тест сонгохгүй: даалгавар бүр «10-р сарын 26 — Логарифм
 * тэгшитгэл 4-5» эсвэл сэдэв тодорхойгүй бол «10-р сарын 26-ны даалгавар».
 * Сурагчийн карт, багшийн шалгах дэлгэц хоёулаа ЭНЭ шошгыг харуулна.
 *
 * Цэвэр функцууд — ӨС-ийн уншилт `homework-lesson.ts`-д.
 */

const WEEKDAY_MN = [
  'Ням',
  'Даваа',
  'Мягмар',
  'Лхагва',
  'Пүрэв',
  'Баасан',
  'Бямба',
];

/** Мөр (string) доторх тусгаарлагч — цэгэн глиф хориотой (STATUS §6.3) */
export const LABEL_SEPARATOR = ' — ';

export interface HomeworkLesson {
  /** Хичээлийн өдөр YYYY-MM-DD */
  date: string;
  /** «Даваа» гэх мэт */
  weekday: string;
  /** «10-р сарын 26» */
  dateText: string;
  /** Тухайн өдрийн сэдэв (төлөвлөгөөний гарчиг, тест, чөлөөт бичвэр); үгүй бол null */
  topic: string | null;
  /** Бүтэн шошго (aria-label, title, мэдэгдэлд) */
  label: string;
}

function parseKey(key: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  if (!match) throw new Error('Invalid date key');
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** «10-р сарын 26» */
export function mnMonthDay(key: string): string {
  const { m, d } = parseKey(key);
  return `${m}-р сарын ${d}`;
}

/** Монгол гараг (JS 0=Ням … 6=Бямба), УБ-ын хуанлийн өдрөөр */
export function mnWeekday(key: string): string {
  const { y, m, d } = parseKey(key);
  return WEEKDAY_MN[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/**
 * Өдрийн тооны харьяалахын нөхцөл: нэг, дөрөв, ес-өөр төгссөн (1, 4, 9, 11, 14,
 * 19, 21, 24, 29, 31) → «-ний», бусад → «-ны» («26-ны», «10-ны», «1-ний»).
 */
export function dayGenitive(day: number): string {
  return [1, 4, 9].includes(day % 10) ? `${day}-ний` : `${day}-ны`;
}

/** Хоосон зай нэгтгэж, хоосон мөрийг null болгоно */
function clean(value: string | null | undefined): string | null {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text : null;
}

/**
 * Өдрийн сэдвийг сонгох дараалал:
 *  1. Баталгаажсан хичээлийн сэдэв (LessonRecord.topic) — багш хичээлийн дараа
 *     «Орох тест» талбарт чөлөөт бичвэрээр бичиж болно (эзэн 2026-10-27), бодитоор
 *     орсон зүйл тул хамгийн итгэлтэй
 *  2. Өдрийн төлөвлөгөөний гарчиг (LessonTopic.title) — тестүүдээс автоматаар
 *     үүссэн эсвэл багшийн чөлөөт бичвэр
 *  3. Гарчиг хоосон боловч тест холбосон бол тестүүдийн нэр
 */
export function resolveLessonTopic(input: {
  planTitle?: string | null;
  testTitles?: string[];
  recordTopic?: string | null;
}): string | null {
  const record = clean(input.recordTopic);
  if (record) return record;
  const plan = clean(input.planTitle);
  if (plan) return plan;
  const tests = (input.testTitles ?? []).map((t) => clean(t)).filter(Boolean);
  return tests.length ? tests.join(', ') : null;
}

/** Шошго угсрах: сэдэвтэй бол «10-р сарын 26 — Сэдэв», үгүй бол «10-р сарын 26-ны даалгавар» */
export function buildHomeworkLesson(
  date: string,
  topic: string | null | undefined,
): HomeworkLesson {
  const { m, d } = parseKey(date);
  const key = date.slice(0, 10);
  const dateText = mnMonthDay(key);
  const cleanTopic = clean(topic);
  return {
    date: key,
    weekday: mnWeekday(key),
    dateText,
    topic: cleanTopic,
    label: cleanTopic
      ? `${dateText}${LABEL_SEPARATOR}${cleanTopic}`
      : `${m}-р сарын ${dayGenitive(d)} даалгавар`,
  };
}

/** УБ-ын хуанлийн өдөр (YYYY-MM-DD) — бодит мөчөөс */
export function ubKeyOf(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
  }).format(at);
}

/**
 * Даалгавар аль хичээлийнх вэ: хадгалсан `lessonDate` (шинэ даалгавар), үгүй бол
 * (2026-10-27-оос өмнөх) үүсгэсэн өдөр — багшийн хуанли ч createdAt-аар бүлэглэдэг.
 */
export function assignmentLessonKey(a: {
  lessonDate?: Date | null;
  createdAt: Date;
}): string {
  return a.lessonDate
    ? a.lessonDate.toISOString().slice(0, 10)
    : ubKeyOf(a.createdAt);
}
