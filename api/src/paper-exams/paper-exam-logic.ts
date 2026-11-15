// Цаасан шалгалтын ЦЭВЭР логик (ӨС-гүй, I/O-гүй) — paper-exam-logic.spec.ts.
// Дүгнэх, бодлого/агуулгын гүйцэтгэл, «сул агуулга», эрэмбэ бүгд эндээс.

/** БҮТ-ийн агуулгын ангилал (эзэн 2026-11-12). Дараалал = дэлгэцийн дараалал. */
export const CONTENT_AREAS = [
  'Тоо тоолол',
  'Алгебр',
  'Анализын эхлэл',
  'Геометр ба тригонометр',
  'Магадлал статистик',
] as const;
export type ContentArea = (typeof CONTENT_AREAS)[number];

export const ANSWER_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * Нэг нүдний хариу:
 *   «A»…«E» — сурагчийн будсан үсэг (машины гаралт)
 *   «»      — хоосон (хариулаагүй)
 *   «*»     — давхар будсан
 *   «+»/«-» — зөвхөн зөв/буруугаар ирсэн дүн (эзний Excel: 1 = зөв)
 *   «2122» — 2-р хэсгийн багцын нүднүүд («_» хоосон, «-» хасах тэмдэг, «*» давхар будсан)
 */
export type SheetAnswer = string;

export type ItemStatus = 'CORRECT' | 'WRONG' | 'BLANK' | 'MULTI' | 'UNGRADED';

export interface PaperItem {
  number: number;
  answerKey: string | null;
  points: number;
  area: string | null;
  /** Сэдэв (бүлэг) — «Модульт тэгшитгэл» … */
  topic?: string | null;
  /** Томьёоны сангийн slug-ууд */
  formulaSlugs?: string[];
  voided: boolean;
  /** Хувилбар бүрийн түлхүүр {"A":"D","B":"B"} — байвал answerKey-ээс давамгайлна */
  answerKeys?: unknown;
  /** «2.1.a-d» — 2-р хэсгийн багц */
  label?: string | null;
  /** Багцын нүдний тоо (>1 бол цифрүүдийг бүгдийг нь тулгана) */
  cells?: number | null;
}

/** Тухайн хувилбарын зөв хариу: answerKeys[variant] → answerKey. */
export function keyFor(
  item: PaperItem,
  variant?: string | null,
): string | null {
  const keys = item.answerKeys;
  if (variant && keys && typeof keys === 'object' && !Array.isArray(keys)) {
    const k = (keys as Record<string, unknown>)[variant];
    if (typeof k === 'string' && k) return k;
  }
  return item.answerKey;
}

/** Ангиллын хэмжээс: БҮТ-ийн агуулга эсвэл сэдэв */
export type ClassifyBy = 'area' | 'topic';

/**
 * Санал болгох сэдвүүд — системийн бусад хэсэгтэй (readiness, томьёоны сан) ижил нэршил.
 * slug нь томьёоны сангийн topicSlugs-тэй таарна → сэдвээр томьёо шүүнэ.
 */
export const PAPER_TOPICS: { slug: string; name: string }[] = [
  { slug: 'TOO', name: 'Тоо тоолол' },
  { slug: 'ALG', name: 'Алгебрийн хувиргалт' },
  { slug: 'RATEQ', name: 'Рационал тэгшитгэл' },
  { slug: 'RATINEQ', name: 'Рационал тэнцэтгэл биш' },
  { slug: 'ABSEQ', name: 'Модультай тэгшитгэл' },
  { slug: 'ABSINEQ', name: 'Модультай тэнцэтгэл биш' },
  { slug: 'IRREQ', name: 'Иррационал тэгшитгэл' },
  { slug: 'IRRINEQ', name: 'Иррационал тэнцэтгэл биш' },
  { slug: 'EXPEQ', name: 'Илтгэгч тэгшитгэл' },
  { slug: 'EXPINEQ', name: 'Илтгэгч тэнцэтгэл биш' },
  { slug: 'LOGEXP', name: 'Логарифмын илэрхийлэл' },
  { slug: 'LOGEQ', name: 'Логарифм тэгшитгэл' },
  { slug: 'LOGINEQ', name: 'Логарифм тэнцэтгэл биш' },
  { slug: 'SYSTEM', name: 'Тэгшитгэлийн систем' },
  { slug: 'PARAM', name: 'Параметртэй бодлого' },
  { slug: 'FUNC', name: 'Функц' },
  { slug: 'TRIG', name: 'Тригонометр' },
  { slug: 'TRIGEQ', name: 'Тригонометр тэгшитгэл' },
  { slug: 'SEQ', name: 'Прогресс' },
  { slug: 'COMB', name: 'Комбинаторик' },
  { slug: 'PROB', name: 'Магадлал' },
  { slug: 'STAT', name: 'Статистик' },
  { slug: 'LIMIT', name: 'Хязгаар' },
  { slug: 'DERIV', name: 'Уламжлал' },
  { slug: 'INTEG', name: 'Интеграл' },
  { slug: 'PLANE', name: 'Хавтгайн геометр' },
  { slug: 'SOLID', name: 'Огторгуйн геометр' },
  { slug: 'VECTOR', name: 'Вектор' },
  { slug: 'COORD', name: 'Координат' },
];

/** Сэдэв оноосон бол сэдвээр, үгүй бол БҮТ-ийн агуулгаар ангилна («сул» баганад). */
export function classifyBy(items: PaperItem[]): ClassifyBy {
  return items.some((i) => i.topic && !i.voided) ? 'topic' : 'area';
}

export function isContentArea(v: unknown): v is ContentArea {
  return (
    typeof v === 'string' && (CONTENT_AREAS as readonly string[]).includes(v)
  );
}

/** Нэг бодлогын төлөв. UNGRADED = хүчингүй, эсвэл үсгээр ирсэн ч түлхүүргүй. */
export function statusOf(
  answer: SheetAnswer | undefined,
  item: PaperItem,
  variant?: string | null,
): ItemStatus {
  if (item.voided) return 'UNGRADED';
  const a = (answer ?? '').trim();
  if (a === '+') return 'CORRECT';
  if (a === '-') return 'WRONG';
  const key = keyFor(item, variant);
  if (!key) return 'UNGRADED';
  if ((item.cells ?? 1) > 1) {
    // 2-р хэсгийн багц: бүх нүд зөв бол л оноо; нэг нүд буруу бол багц бүхэлдээ 0
    if (a === '' || /^_+$/.test(a)) return 'BLANK';
    return a === key ? 'CORRECT' : 'WRONG';
  }
  if (a === '') return 'BLANK';
  if (a === '*') return 'MULTI';
  return a === key ? 'CORRECT' : 'WRONG';
}

export interface GradedSheet {
  statuses: ItemStatus[];
  totalScore: number;
  maxScore: number;
}

/** items нь number-ээр эрэмбэлэгдсэн, answers[i] нь items[i]-д харгалзана. */
export function gradeSheet(
  answers: SheetAnswer[],
  items: PaperItem[],
  variant?: string | null,
): GradedSheet {
  let total = 0;
  let max = 0;
  const statuses = items.map((item, i) => {
    const st = statusOf(answers[i], item, variant);
    if (st !== 'UNGRADED') {
      max += item.points;
      if (st === 'CORRECT') total += item.points;
    }
    return st;
  });
  return { statuses, totalScore: total, maxScore: max };
}

export function pct(part: number, whole: number): number | null {
  // Нэг оронтой бутархай — бүхэлчлэхгүй (эзэн 2026-11-15)
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

export interface AreaScore {
  area: string;
  earned: number;
  possible: number;
  pct: number | null;
}

/** Агуулга бүрийн авсан/боломжит оноо. Агуулга оноогоогүй бодлого тооцогдохгүй. */
export function areaScores(
  sheets: ItemStatus[][],
  items: PaperItem[],
  by: ClassifyBy = 'area',
): AreaScore[] {
  const acc = new Map<string, { earned: number; possible: number }>();
  for (const statuses of sheets) {
    items.forEach((item, i) => {
      const name = by === 'topic' ? item.topic : item.area;
      if (!name) return;
      const st = statuses[i];
      if (st === 'UNGRADED' || st === undefined) return;
      const a = acc.get(name) ?? { earned: 0, possible: 0 };
      a.possible += item.points;
      if (st === 'CORRECT') a.earned += item.points;
      acc.set(name, a);
    });
  }
  // Агуулга — БҮТ-ийн дарааллаар; сэдэв — шалгалтад анх гарсан дарааллаар
  const names =
    by === 'topic'
      ? [...new Set(items.flatMap((i) => (i.topic ? [i.topic] : [])))].filter(
          (n) => acc.has(n),
        )
      : orderAreas([...acc.keys()]);
  return names.map((area) => {
    const a = acc.get(area)!;
    return {
      area,
      earned: a.earned,
      possible: a.possible,
      pct: pct(a.earned, a.possible),
    };
  });
}

/** CONTENT_AREAS-ийн дарааллаар, жагсаалтад байхгүй нэр төгсгөлд цагаан толгойгоор. */
export function orderAreas(names: string[]): string[] {
  const known = CONTENT_AREAS.filter((a) => names.includes(a)) as string[];
  const rest = names
    .filter((n) => !isContentArea(n))
    .sort((a, b) => a.localeCompare(b, 'mn'));
  return [...known, ...rest];
}

/**
 * «Сул агуулга» — хамгийн бага хувьтай агуулга (тэнцвэл бүгд, дээд тал нь 2).
 * Бүх агуулга 100% эсвэл агуулга оноогоогүй бол хоосон.
 */
export function weakAreas(scores: AreaScore[]): string[] {
  const graded = scores.filter(
    (s): s is AreaScore & { pct: number } => s.pct !== null,
  );
  if (graded.length === 0) return [];
  const min = Math.min(...graded.map((s) => s.pct));
  if (min >= 100) return [];
  return graded
    .filter((s) => s.pct === min)
    .slice(0, 2)
    .map((s) => s.area);
}

export interface ItemStat {
  number: number;
  correct: number;
  graded: number;
  pct: number | null;
  /** Хамгийн олон сонгогдсон буруу үсэг (түлхүүртэй, үсгээр ирсэн үед) */
  topWrong: { letter: string; count: number } | null;
}

/** Бодлого бүрийн гүйцэтгэл. answers нь үсгийн тархалтад л хэрэгтэй. */
export function itemStats(
  sheets: { statuses: ItemStatus[]; answers: SheetAnswer[] }[],
  items: PaperItem[],
): ItemStat[] {
  return items.map((item, i) => {
    let correct = 0;
    let graded = 0;
    const wrongLetters = new Map<string, number>();
    for (const s of sheets) {
      const st = s.statuses[i];
      if (st === 'UNGRADED' || st === undefined) continue;
      graded += 1;
      if (st === 'CORRECT') correct += 1;
      else if (st === 'WRONG') {
        const letter = (s.answers[i] ?? '').trim();
        if ((ANSWER_LETTERS as readonly string[]).includes(letter)) {
          wrongLetters.set(letter, (wrongLetters.get(letter) ?? 0) + 1);
        }
      }
    }
    let topWrong: ItemStat['topWrong'] = null;
    for (const [letter, count] of wrongLetters) {
      if (!topWrong || count > topWrong.count) topWrong = { letter, count };
    }
    return {
      number: item.number,
      correct,
      graded,
      pct: pct(correct, graded),
      topWrong,
    };
  });
}

/**
 * Өрсөлдөөний эрэмбэ (1, 2, 2, 4): ижил оноо = ижил байр.
 * Буцаах массив нь оролтын дараалалтай ижил.
 */
export function competitionRanks(scores: number[]): number[] {
  return scores.map((s) => 1 + scores.filter((o) => o > s + 1e-9).length);
}

/**
 * Байрны шошго: ижил оноотой сурагчид нэг байрыг хуваана — «1-2», «3», «4-6».
 * Элсэлтийн шалгалтын жагсаалтын хэв маяг (эзэн 2026-11-15).
 */
export function rankLabels(scores: number[]): string[] {
  const sorted = [...scores].sort((a, b) => b - a);
  return scores.map((s) => {
    const first = 1 + sorted.filter((o) => o > s + 1e-9).length;
    const last = sorted.filter((o) => o > s - 1e-9).length;
    return first === last ? String(first) : `${first}-${last}`;
  });
}

/** Олон нийтэд харуулах нэр: «Болор-Эрдэнэ Б.» (овгийн эхний үсэг). */
export function publicName(firstName: string, lastName: string): string {
  const initial = lastName.trim().charAt(0);
  return initial
    ? `${firstName.trim()} ${initial.toLocaleUpperCase('mn-MN')}.`
    : firstName.trim();
}

/** Түлхүүрийн үсгийг цэвэрлэнэ: кирилл ижил дүрстэй үсгийг латин болгоно. */
export function normalizeLetter(raw: string): string | null {
  // Зөвхөн дүрсээрээ ижил үсэг (А Б В Г Д дараалал биш — тэр нь өөр утгатай)
  const map: Record<string, string> = { А: 'A', В: 'B', С: 'C', Е: 'E' };
  const t = raw.trim().toUpperCase();
  if (t.length !== 1) return null;
  const v = map[t] ?? t;
  return (ANSWER_LETTERS as readonly string[]).includes(v) ? v : null;
}
