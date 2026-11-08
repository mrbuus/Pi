/**
 * Нөхөлтийн цэвэр логик (I/O-гүй, бүрэн тесттэй) — эзэн 2026-11-08.
 *
 * Нөхөлт = сурагч өөрийн ангидаа хийж чадаагүй хичээлээ
 *  (а) өөр ангийн хичээлд сууж нөхөх (ж: 12-4-ийн сурагч 12-6-д), эсвэл
 *  (б) 406 өрөөнд (хуваарьгүй, ямар ч өдөр) ирж нөхөх.
 */

/** 406 өрөөний placeKey. Ангийн id cuid тул хэзээ ч давхцахгүй. */
export const ROOM_406 = '406';

/** Давхардлын түлхүүр: зочилсон анги эсвэл 406 */
export function placeKeyOf(hostClassroomId: string | null | undefined): string {
  return hostClassroomId ? hostClassroomId : ROOM_406;
}

/* ───────── Нэрээр хайх (монгол үсэг, том жижиг ялгахгүй) ───────── */

/**
 * Хайлтын харьцуулалтын хэлбэр: жижиг үсэг (Ү→ү, Ө→ө — `mn` locale), ё→е,
 * зураас/цэгийг зай болгож, илүү зайг шахна. ӨС-ийн collation-оос үл хамаарна.
 */
export function normalizeName(s: string | null | undefined): string {
  return (s ?? '')
    .toLocaleLowerCase('mn')
    .replace(/ё/g, 'е')
    .replace(/[.,\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchableStudent {
  id: string;
  firstName: string;
  lastName: string;
  code: string | null;
}

/** Хамгийн богино хайлт (1 үсгээр 700 сурагч гарахгүй) */
export const SEARCH_MIN = 2;
export const SEARCH_LIMIT = 30;

/**
 * Нэр, овог, кодоор хайна. Үг бүр нэр/овог/кодын аль нэгэнд агуулагдах ёстой
 * («мишээл», «б мишээл», «баяр миш»). Эрэмбэ: нэр нь хайлтаар эхэлсэн → нэр нь
 * агуулсан → бусад; дотроо нэр, овгоор.
 */
export function matchStudents<T extends SearchableStudent>(
  query: string,
  students: T[],
  limit = SEARCH_LIMIT,
): T[] {
  const q = normalizeName(query);
  if (q.replace(/\s/g, '').length < SEARCH_MIN) return [];
  const tokens = q.split(' ');
  const scored: { s: T; rank: number; first: string; last: string }[] = [];
  for (const s of students) {
    const first = normalizeName(s.firstName);
    const last = normalizeName(s.lastName);
    const code = normalizeName(s.code);
    const hay = [first, last, code];
    if (!tokens.every((t) => hay.some((h) => h.includes(t)))) continue;
    const rank = tokens.some((t) => first.startsWith(t))
      ? 0
      : tokens.some((t) => first.includes(t))
        ? 1
        : 2;
    scored.push({ s, rank, first, last });
  }
  scored.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.first.localeCompare(b.first, 'mn') ||
      a.last.localeCompare(b.last, 'mn') ||
      a.s.id.localeCompare(b.s.id),
  );
  return scored.slice(0, limit).map((x) => x.s);
}

/* ───────── Сурагчийн өөрийн анги ───────── */

export interface ActiveEnrollment {
  classroomId: string;
  classroomType: string;
  joinedAt: Date;
}

export type HomeResult =
  | { ok: true; homeClassroomId: string | null }
  | { ok: false; reason: 'OWN_CLASS' };

/**
 * Нэмэх үеийн өөрийн анги (snapshot). Зочилсон ангид өөрөө идэвхтэй сурагч бол
 * зочноор нэмэхгүй (OWN_CLASS). Олон ангитай бол танхимын анги, сүүлд элссэн нь.
 * Ангигүй сурагч ч нөхөж болно (null).
 */
export function pickHomeClassroom(
  enrollments: ActiveEnrollment[],
  hostClassroomId: string | null,
): HomeResult {
  if (hostClassroomId && enrollments.some((e) => e.classroomId === hostClassroomId))
    return { ok: false, reason: 'OWN_CLASS' };
  const sorted = [...enrollments].sort(
    (a, b) =>
      Number(b.classroomType === 'IN_PERSON') - Number(a.classroomType === 'IN_PERSON') ||
      b.joinedAt.getTime() - a.joinedAt.getTime() ||
      a.classroomId.localeCompare(b.classroomId),
  );
  return { ok: true, homeClassroomId: sorted[0]?.classroomId ?? null };
}

/* ───────── Огноо ───────── */

/** Нөхөлт зөвхөн өнгөрсөн эсвэл өнөөдөр (ирээдүйд «нөхөж суусан» гэж бичихгүй) */
export function isAllowedVisitDate(key: string, todayKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= todayKey;
}

/* ───────── Хийсэн тест/сэдэв ───────── */

export type CoveredSource = 'CONFIRMED' | 'PLANNED' | 'RECORDED';

export interface CoveredItem {
  /** Бодлогын сангийн тест; null = гараар бичсэн сэдэв/тест */
  testId: string | null;
  title: string;
  source: CoveredSource;
}

/**
 * Зочилсон ангийн тэр өдрийн хичээлийн тест: БАТАЛСАН (ClassTestSession) байвал
 * түүгээр, эс бөгөөс ТӨЛӨВЛӨСӨН (LessonTopic.testIds + customTopics). Уншихдаа
 * тооцдог тул багш хичээлийг дараа нь баталсан ч сурагчийн нөхөлт зөв гарна.
 */
export function hostLessonCovered(input: {
  sessions: { testId: string | null; manualTitle: string | null }[];
  planned: { testIds: string[]; customTopics: string[] }[];
  titleOf: (testId: string) => string | undefined;
}): CoveredItem[] {
  const seen = new Set<string>();
  const out: CoveredItem[] = [];
  const push = (item: CoveredItem) => {
    const key = item.testId ? `t:${item.testId}` : `x:${normalizeName(item.title)}`;
    if (!item.title.trim() || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };
  if (input.sessions.length) {
    for (const s of input.sessions) {
      if (s.testId) push({ testId: s.testId, title: input.titleOf(s.testId) ?? 'Тест', source: 'CONFIRMED' });
      else if (s.manualTitle) push({ testId: null, title: s.manualTitle, source: 'CONFIRMED' });
    }
    return out;
  }
  for (const p of input.planned) {
    for (const id of p.testIds) push({ testId: id, title: input.titleOf(id) ?? 'Тест', source: 'PLANNED' });
    for (const t of p.customTopics) push({ testId: null, title: t, source: 'PLANNED' });
  }
  return out;
}

/* ───────── 406-ийн сэдвийг солих ───────── */

export interface WantedTest {
  testId: string | null;
  title: string;
}
export interface StoredTest extends WantedTest {
  id: string;
}

const testKey = (t: WantedTest) => (t.testId ? `t:${t.testId}` : `x:${normalizeName(t.title)}`);

/** Нэг нөхөлтөд хамгийн ихдээ */
export const MAX_TESTS = 30;

/**
 * Хүссэн жагсаалт руу шилжүүлэх: аль хэдийн байгааг ХӨНДӨХГҮЙ, шинийг нэмж,
 * хасагдсаныг (зөөлөн) устгана. Хүссэн жагсаалтын давхардлыг арилгана.
 */
export function diffTests(
  current: StoredTest[],
  wanted: WantedTest[],
): { add: WantedTest[]; remove: string[] } {
  const want = new Map<string, WantedTest>();
  for (const w of wanted) {
    const title = w.title.replace(/\s+/g, ' ').trim();
    if (!title) continue;
    const item = { testId: w.testId || null, title: title.slice(0, 200) };
    const k = testKey(item);
    if (!want.has(k)) want.set(k, item);
  }
  const have = new Map<string, StoredTest>();
  const remove: string[] = [];
  for (const c of current) {
    const k = testKey(c);
    // Хуучин давхар мөр байвал нэгийг л үлдээнэ
    if (have.has(k) || !want.has(k)) remove.push(c.id);
    else have.set(k, c);
  }
  const add = [...want.entries()].filter(([k]) => !have.has(k)).map(([, v]) => v);
  return { add, remove };
}

/* ───────── Үүсгэх хүсэлтийн төлөвлөгөө ───────── */

export type SkipReason = 'DUPLICATE' | 'OWN_CLASS' | 'NOT_STUDENT';

/**
 * Нэмэх сурагчдыг ангилна: давхар id-г нэг болгож, аль хэдийн тэр өдөр тэр газарт
 * бүртгэгдсэн (идэвхтэй) бол DUPLICATE. OWN_CLASS/NOT_STUDENT-ийг дуудагч шийднэ.
 */
export function planCreate(
  studentIds: string[],
  alreadyVisited: Set<string>,
): { create: string[]; skipped: { studentId: string; reason: SkipReason }[] } {
  const create: string[] = [];
  const skipped: { studentId: string; reason: SkipReason }[] = [];
  const seen = new Set<string>();
  for (const id of studentIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (alreadyVisited.has(id)) skipped.push({ studentId: id, reason: 'DUPLICATE' });
    else create.push(id);
  }
  return { create, skipped };
}

/** Самбар дээрх шошго: «12-6 ангид нөхөж суусан» / «406-д нөхөж хийсэн» */
export function placeLabel(hostName: string | null): string {
  return hostName ? `${shortClassName(hostName)} ангид нөхөж суусан` : '406-д нөхөж хийсэн';
}

/** «12-6 (Баруун 4)» → «12-6» */
export function shortClassName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name;
}
